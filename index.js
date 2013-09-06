var knox = require('knox')
  , Resource = require('deployd/lib/resource')
  , httpUtil = require('deployd/lib/util/http')
  , formidable = require('formidable')
  , fs = require('fs')
  , util = require('util')
  , path = require('path');

function S3Bucket(name, options) {
  Resource.apply(this, arguments);
  if (this.config.key && this.config.secret && this.config.bucket) {
    this.client = knox.createClient({
        key: this.config.key
      , secret: this.config.secret
      , bucket: this.config.bucket
      , region: this.config.region
    });
  }
}
util.inherits(S3Bucket, Resource);
module.exports = S3Bucket;
S3Bucket.label = "S3 Bucket";

S3Bucket.prototype.clientGeneration = true;

S3Bucket.events = ["upload", "get", "delete"];
S3Bucket.basicDashboard = {
  settings: [{
      name: 'bucket'
    , type: 'string'
  }, {
      name: 'key'
    , type: 'string'
  }, {
      name: 'secret'
    , type: 'string'
  }, {
      name: 'region',
      type: 'string',
      description: 'the region of your s3 bucket, ex: \'us-west-2\''
  }, {
      name: 'publicRead',
      type: 'checkbox',
      description: 'when files are uploaded to your bucket, automatically set public read access?'

  }]
};

S3Bucket.prototype.handle = function (ctx, next) {
  var req = ctx.req
    , bucket = this
    , domain = {url: ctx.url};

  if (!this.client) return ctx.done("Missing S3 configuration!");

  if (req.method === "POST" && !req.internal && req.headers['content-type'].indexOf('multipart/form-data') === 0) {
    var form = new formidable.IncomingForm();
    var remaining = 0;
    var files = [];
    var error;
    var lastFile;

    var uploadedFile = function(err) {
      if (err) {
        error = err;
        return ctx.done(err);
      } else if (!err) {
        remaining--;
        if (remaining <= 0) {
          if (req.headers.referer) {
            ctx.done(null,{'file':ctx.url, 'success':true, 'filesize':lastFile.size});
          } else {
            ctx.done(null, files);
          }
        }
      }
    };

    form.parse(req)
      .on('file', function(name, file) {
        remaining++;
        lastFile = file;
        if (bucket.events.upload) {
          bucket.events.upload.run(ctx, {url: ctx.url, fileSize: file.size, fileName: ctx.url}, function(err) {
            if (err) return uploadedFile(err);
            bucket.uploadFile(ctx.url, file.size, file.type, fs.createReadStream(file.path), uploadedFile);  
          });
        } else {
          bucket.uploadFile(ctx.url, file.size, file.type, fs.createReadStream(file.path), uploadedFile);
        }
      })
      .on('error', function(err) {
        ctx.done(err);
        error = err;
      });
    req.resume();
    return;
  }

  if (req.method === "POST" || req.method === "PUT") {
    
    domain.fileSize = ctx.req.headers['content-length'];
    domain.fileName = path.basename(ctx.url);
    
    if (this.events.upload) {
      this.events.upload.run(ctx, domain, function(err) {
        if (err) return ctx.done(err);
        bucket.upload(ctx, next);
      });
    } else {
      this.upload(ctx, next);
    }

  } else if (req.method === "GET") {
    if (ctx.res.internal) return next(); // This definitely has to be HTTP.

    if (this.events.get) {
      this.events.get.run(ctx, domain, function(err) {
        if (err) return ctx.done(err);
        bucket.get(ctx, next);
      });
    } else {
      this.get(ctx, next);
    }

  } else if (req.method === "DELETE") {
    
    if (this.events['delete']) {
      this.events['delete'].run(ctx, domain, function(err) {
        if (err) return ctx.done(err);
        bucket.del(ctx, next);
      }); 
    } else {
      this.del(ctx, next);
    }
  } else {
    next();
  }
};

S3Bucket.prototype.uploadFile = function(filename, filesize, mime, stream, fn) {
  var bucket = this;

  var headers = {
      'Content-Length': filesize
    , 'Content-Type': mime
  };

  if(this.config.publicRead){
    headers['x-amz-acl'] = 'public-read';
  }

  this.client.putStream(stream, filename, headers, function(err, res) { 
    if (err) return ctx.done(err);
    if (res.statusCode !== 200) {
      bucket.readStream(res, function(err, message) {
        fn(err || message);
      });
    } else {
      fn();
    }
  });
};

S3Bucket.prototype.upload = function(ctx, next) {
  var bucket = this
    , req = ctx.req;

  var headers = {
      'Content-Length': req.headers['content-length']
    , 'Content-Type': req.headers['content-type']
  };

  this.client.putStream(req, ctx.url, headers, function(err, res) { 
    if (err) return ctx.done(err);
    if (res.statusCode !== 200) {
      bucket.readStream(res, function(err, message) {
        ctx.done(err || message);
      });
    } else {
      ctx.done();
    }
  });
  req.resume();
};

S3Bucket.prototype.get = function(ctx, next) {
  var bucket = this;
  var url;
  if(this.config.region){
    url = 'https://s3-'+this.config.region+'.amazonaws.com/' + this.config.bucket + ctx.url;
  }else{
    url = 'https://s3.amazonaws.com/' + this.config.bucket + ctx.url;
  }

  httpUtil.redirect(ctx.res, url);
};

S3Bucket.prototype.del = function(ctx, next) {
  var bucket = this;

  this.client.deleteFile(ctx.url, function(err, res) {
    if (err) ctx.done(err);
    if (res.statusCode !== 200) {
      bucket.readStream(res, function(err, message) {
        ctx.done(err || message);
      });
    } else {
      ctx.done();
    }
  });
};

S3Bucket.prototype.readStream = function(stream, fn) {
  var buffer = '';
  stream.on('data', function(data) {
    buffer += data;
  }).on('end', function() {
    fn(null, buffer);
  }).on('error', function(err) {
    fn(err);
  });
};
