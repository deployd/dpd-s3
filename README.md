# dpd-s3

[![npm](https://img.shields.io/npm/v/dpd-s3.svg?style=flat-square)](https://www.npmjs.com/package/dpd-s3)

## Description

This module allows you to generate [AWS S3 pre-signed URL](http://docs.aws.amazon.com/AmazonS3/latest/dev/PresignedUrlUploadObject.html) that can be used to upload, retrieve or delete files on AWS s3.

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


Put signedUrl
```
dpd.s3bucket.get('apple.jpg', {
    signedUrl: 'Put'
    ContentType: 'image/jpeg'
}, function(signedUrl, err){

    // regular http put file to signedUrl
    $.ajax({type:'Put', url:signedUrl}, ...);

})
```


Get signedUrl
```
<img src="/s3bucket/apple.jpg" />

OR

dpd.s3bucket.get('apple.jpg', {
    returnFormat: 'Url'
}, function(signedUrl, err){
    console.log(signedUrl);
})
```


Get signedUrl
```
dpd.s3bucket.delete('apple.jpg', function(ret, err){
    console.log(ret, err);
})
```


## Contributing

Just send me a Pull Request in Github.

## Release history

- 0.1.0: refactor to use aws-sdk and signedUrl instead of direct upload

## Contributors

[Eric Fong](https://github.com/ericfong)
[cowgp](https://github.com/cowgp)
[dallonf](https://github.com/dallonf)
