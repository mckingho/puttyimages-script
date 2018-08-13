## Set config in upload.js:
- ipfsEndpoint: line 15. Change this to a provided endpoint. (Please tell us the estimated total image size, so we can host sufficient IPFS node for uploading)
- inPath: line 16. File path of json files and images. Each json file represents one image.

## Json format example:
```
{
    "file": "example.png",
    "dateCreated": "2018-08-13T00:00:00Z",
    "description": "green background",
    "license": "cc0",
    "likeOwner": [
        "Michael Cheung"
    ],
    "tags": ["green", "00ff00"],
    "sourceLink": "https://like.co/michaelcheung"
}
```

### Required fields:
1. file
1. license
1. likeOwner
1. tags

- file: filename to be uploaded by script (string)
- license: one of "cc0", "cc-by", "cc-by-nd", "cc-by-sa" (string)
- likeOwner: array of owner name (array of strings)
- tags: at most 5 tags in puttyimages (array of strings)

### Optional fields:
1. dateCreated
1. description
1. sourceLink

- dateCreated: date that photo is taken (date string)
- description: image description (string)
- sourceLink: a profile or contact page of image owner (URL string)

## Run command:
- npm install
- node upload.js

## Result files:
1. upload-asset.csv
1. upload-asset-tag.csv
- Please send 2 output csv files back to us. Then we will update puttyimages database.

