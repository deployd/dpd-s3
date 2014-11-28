var knox = require('knox')
, Resource = require('deployd/lib/resource')
, httpUtil = require('deployd/lib/util/http')
, formidable = require('formidable')
, fs = require('fs')
, util = require('util')
, path = require('path');

var AWS = require('aws-sdk');

function S3Bucket(name, options) {
    Resource.apply(this, arguments);
    if (this.config.key && this.config.secret && this.config.bucket) {
        this.client = knox.createClient({
            key: this.config.key,
            secret: this.config.secret,
            bucket: this.config.bucket,
            region: this.config.region
        });

        this.s3 = new AWS.S3({
            accessKeyId:this.config.key,
            secretAccessKey: this.config.secret,
            region: this.config.region,
        });
        this.s3BucketName = this.config.bucket;
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
        name: 'region'
        , type: 'string'
    }, {
        name: 'basePath',
        type: 'text',
        description : 'base url for where someone could GET the file off the bucket (cloud front url if you are using that)'
    }, {
        name: 'publicRead',
        type: 'checkbox',
        description: 'when files are uploaded to your bucket, automatically set public read access?'
    // }, {
    //     name: 'useSignedUrl',
    //     type: 'checkbox',
    //     description: 'use SignedUrl, so client directly connect with s3'
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
        var fullBucketPath;

        var uploadedFile = function(err) {
            if (err) {
                error = err;
                return ctx.done(err);
            } else if (!err) {
                remaining--;
                if (remaining <= 0) {
                    if (req.headers.referer) {
                        ctx.done(null,{'file':bucket.config.basePath+fullBucketPath, 'success':true, 'filesize':lastFile.size});
                        //httpUtil.redirect(ctx.res, req.headers.referer || '/');
                    } else {
                        ctx.done(null, files);
                    }
                }
            }
        };
        var cleanseFilename = function(incomingFilename){
            //console.log("incoming filename: "+incomingFilename);
            var filename = incomingFilename;
            var extension = null;
            if(incomingFilename.indexOf('.') != -1){
                var pieces = incomingFilename.split('.');
                extension = pieces.pop();
                filename = pieces.join('.');
            }
            //console.log("filename: "+filename);
            //console.log('extension: '+extension);
            filename = filename.replace(/\s+/g, '-').toLowerCase(); //converst space to dash
            //console.log('replaced spaces with dashes: '+filename);
            filename = filename.replace(/[^a-z0-9_\-]/gi, ''); // drop all other funny business
            //console.log('dropped bad characters: '+filename);
            if(extension){
                //console.log('completed result: '+filename+'.'+extension);
                return filename+'.'+extension;
            }
            return filename;
        };

        form.parse(req)
        .on('file', function(name, file) {
            remaining++;
            //console.log("form.parse.on: filename:"+name+" - "+JSON.stringify(file));
            //console.log("ctx url is: "+ctx.url);
            lastFile = file;
            var cleanName = cleanseFilename(file.name);
            //console.log('cleanName: '+cleanName);
            if(ctx.url.slice(-1)==='/'){
                fullBucketPath = ctx.url+cleanName;
            }else{
                fullBucketPath = ctx.url+'/'+cleanName;
            }
            if (bucket.events.upload) {
                bucket.events.upload.run(ctx, {url: ctx.url, fileSize: file.size, fileName: ctx.url}, function(err) {
                    if (err) return uploadedFile(err);
                    bucket.uploadFile(fullBucketPath, file.size, file.type, fs.createReadStream(file.path), uploadedFile);
                });
            } else {
                bucket.uploadFile(fullBucketPath, file.size, file.type, fs.createReadStream(file.path), uploadedFile);
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
        //console.log("in if POST");
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
        // allow script get the redirected link
        // if (ctx.res.internal) {
        //     return next(); // This definitely has to be HTTP.
        // }

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
    //console.log("filename:"+filename);
    //console.log("fileSize:"+filesize);
    //console.log("mime:"+mime);
    //console.log("stream:"+stream);
    var headers = {
        'Content-Length': filesize
        , 'Content-Type': mime

    };

    if(this.config.publicRead){
        headers['x-amz-acl'] = 'public-read';
    } else {
        headers['x-amz-acl'] = 'private';
    }

    //, 'x-amz-acl': 'public-read'
    this.client.putStream(stream, filename, headers, function(err, res) {
        //console.log("res: "+res.statusCode);
        //console.log("err: "+JSON.stringify(err));
        if (err) return ctx.done(err);
        if (res.statusCode !== 200) {
            bucket.readStream(res, function(err, message) {
                fn(err || message);
            });
        } else {
            //console.log("S3 status code was 200");
            //console.log("message: "+res.message);
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

    // use signedUrl Put
    if ( ctx.query.signedUrl == 'Put' ) {

        var s3Key = ctx.url[0] == '/' ? ctx.url.substr(1) : ctx.url;
        //console.log(s3Key, ctx.query.ContentType, ctx.query.ContentLength);
        var params = {
            Bucket: this.s3BucketName,
            Key: s3Key,
            Expires: 5*60, // 5*60 seconds
            ContentType: ctx.query.ContentType,
            //ContentLength: ctx.query.ContentLength,
        };
        this.s3.getSignedUrl('putObject', params, function(err, url){
            ctx.done(err, url);
        });

        return;
    }

    // use signedUrl Get
    if ( !this.config.publicRead ) {

        var s3Key = ctx.url[0] == '/' ? ctx.url.substr(1) : ctx.url;
        var params = {
            Bucket: this.s3BucketName,
            Key: s3Key,
            Expires: 60, // 60 seconds
        };
        this.s3.getSignedUrl('getObject', params, function(err, url){
            if (err) {
                return ctx.done(err);
            }
            //httpUtil.redirect(ctx.res, url);
            ctx.res.statusCode = 301;
            ctx.res.setHeader("Location", url);
            ctx.res.end(url);
        });

        return;
    }


    var bucket = this;
    var url;
    if(this.config.region){
        url = 'https://s3-'+this.config.region+'.amazonaws.com/' + this.config.bucket + ctx.url;
        //console.log("getting image: "+url);
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
