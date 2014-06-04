# dpd-s3 v0.2.0

Deployd module for a resource to GET/POST to and from an AWS s3 bucket

This is based on Ritchie Martori's origin version ( https://github.com/deployd/dpd-s3 ) which was un-published from npm as it didn't work.  Ritchie accepted the pull request with my changes to make it work again, but hasn't ever re-published it.  So I am publishing it as I frequently use it.

Since then I have continued to make changes to suite my specific needs.  

## Install

	npm install dpd-s3

## Configuration

Add a resource in the deployd dashboard selecting dpd-imageWrangler and name your resource. In the config for your new resource, you'll need to supply:

-	AWS Access Key
- 	AWS Secret
-	AWS region (example: "us standard")
-	AWS S3 bucket name (all lower case)

*additional optional configurations:*

-	basePath.  optionally include a base url (like your Cloud Front url) to be inlcuded with the image urls in the repsonse JSON object.
-	Public read access. When files are placed on your S3 bucket, automatically flag them for public read.

## Usage

1) Create the resource in deployd

2) Create a post request
 - destination url: the name of the resource ( 's3bucket' by default) - example uploads to the uploads url in the bucket

HTML example:
			 <form action="http://myapp.com/s3bucket/uploads" enctype="multipart/form-data" method="post">
                  <input type="file" name="upload" multiple="multiple" />
                  <button type="submit">Upload</button>
              </form>


3 - optional ) Add a collection to catch the data returned after the upload 

Typical example:

// 	~/resources/uploads/config.json
```json
{
	"type": "Collection",
	"properties": {
		"creator": {
			"name": "creator",
			"type": "string",
			"typeLabel": "string",
			"required": false,
			"id": "creator",
			"order": 0
		},
		"url": {
			"name": "url",
			"type": "string",
			"typeLabel": "string",
			"required": false,
			"id": "url",
			"order": 1
		},
		"filename": {
			"name": "filename",
			"type": "string",
			"typeLabel": "string",
			"required": false,
			"id": "filename",
			"order": 2
		},
		"timestamp": {
			"name": "timestamp",
			"type": "number",
			"typeLabel": "number",
			"required": false,
			"id": "timestamp",
			"order": 3
		},
		"filesize": {
			"name": "filesize",
			"type": "number",
			"typeLabel": "number",
			"required": false,
			"id": "filesize",
			"order": 4
		}
	}
}
```

// ~/resources/uploads/post.js
```javascript
    this.timestamp = new Date().getTime();
    if( !internal ){
       console.log(this.timestamp + "- WARNING: user trying to upload files in unauthorized fashion.") ;
       cancel("operation not allowed", 401);
    }
```

// And then in ~/resouces/s3bucket/upload.js
```javascript
   // On Upload
    // Set a limit on file size
    if (fileSize > 1024*1024*1024) { // 1GB
        cancel("File is too big; limit is 1GB");
    }

	url =  "http://" + bucketName + fullBucketPath;

	dpd.uploads.post({ filesize: fileSize, filename: fileName, url: url, creator: me.id }, function(request, err) {
	    if(err){
	    	var timestamp = new Date();
	    	console.log(timestamp + "AWS file upload err: ", err);
	    }
	});
```
//    
