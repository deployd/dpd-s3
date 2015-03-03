# dpd-s3

[![npm](https://img.shields.io/npm/v/dpd-s3.svg?style=flat-square)](https://www.npmjs.com/package/dpd-s3)

## Description

deployd module that generate [AWS S3 signedUrl](http://docs.aws.amazon.com/AmazonS3/latest/dev/PresignedUrlUploadObject.html). You can HTTP PUT/GET/DELETE files via the signedUrl from s3 storage.


## Getting started
This module requires deployd ~0.7.0.

If you haven't used Deployd before, make sure to read the [documentation](http://docs.deployd.com/).

### Installation without package.json
````
npm install dpd-s3
````

### Installation with package.json
If you have a package.json, you'll have to add this module in it.
````
npm install dpd-s3 --save
````
Once it is installed, Deployd will automatically load it.  
For more information about Modules, take a look at [the module page on the deployd documentation](http://docs.deployd.com/docs/using-modules/).

## The dpd-s3 module
### Overview

It is a simple [aws-sdk](https://www.npmjs.org/package/aws-sdk) wrapper for deployd

### Options/Settings

Require:
- AWS Access Key
- AWS Access Secret
- S3 Region
- S3 bucket

Please fill them in using the deployd dashboard config page of this module.


### Usage example

#### Using dpd.js

Dpd-s3 request a Signed URL to allow uploading/downloading a file.

Request a Signed URL to upload a file named 'apple.jpg'
```
dpd.s3bucket.get('apple.jpg', {
    signedUrl: 'Put'
    ContentType: 'image/jpeg'
}, function(signedUrl, err){

    // regular http put file to signedUrl
    $.ajax({type:'Put', url:signedUrl}, ...);

})
```


Request a Signed URL to download a file named 'apple.jpg'
```
<img src="/s3bucket/apple.jpg" />

OR

dpd.s3bucket.get('apple.jpg', {
    returnFormat: 'Url'
}, function(signedUrl, err){
    console.log(signedUrl);
})
```

Delete file names 'apple.jpg'
```
dpd.s3bucket.delete('apple.jpg', function(ret, err){
    console.log(ret, err);
})
```

#### Using HTTP Requests

Request a Signed URL to upload a file named 'apple.jpg'
```
GET http://localhost:2403/my-bucket/apple.jpg?ContentType=image/jpeg&signedUrl=Put
```


Request a Signed URL to download a file named 'apple.jpg'
```
GET http://localhost:2403/my-bucket/apple.jpg?returnFormat=Url
```


Delete file names 'apple.jpg'
```
DELETE http://localhost:2403/my-bucket/apple.jpg
```

## Contributing

Just send me a Pull Request in Github.

## Release history

- 0.1.0: refactor to use aws-sdk and signedUrl instead of direct upload

## Contributors

[Eric Fong](https://github.com/ericfong)
[cowgp](https://github.com/cowgp)
[dallonf](https://github.com/dallonf)
