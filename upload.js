const ipfsAPI = require('ipfs-api');
const url = require('url');
const util = require('util');
const fs = require('fs');
const sha256 = require('js-sha256');
const bs58 = require('bs58');
const imageSize = require('image-size');
const imageType = require('image-type');

readFile = util.promisify(fs.readFile);
appendFile = util.promisify(fs.appendFile);
readdir = util.promisify(fs.readdir);

/* FIXME change to desired value */
const ipfsEndpoint = 'http://localhost:5001/';
const inPath = './data/';
const outAssetFile = 'upload-asset.csv';
const outAssetTagFile = 'upload-asset-tag.csv';
/* FIXME */

const ipfsURL = url.parse(ipfsEndpoint);
const host = ipfsURL.hostname;
const port = ipfsURL.port;
const protocol = ipfsURL.protocol.replace(':', '');
const ipfs = ipfsAPI(host, port, { protocol });
const LICENSE = {
  'cc-by': 'https://creativecommons.org/licenses/by/4.0/',
  'cc-by-nd': 'https://creativecommons.org/licenses/by-nd/4.0/',
  'cc-by-sa': 'https://creativecommons.org/licenses/by-sa/4.0/',
  cc0: 'http://creativecommons.org/licenses/publicdomain/',
};

async function uploadIpfs(fileBuffer) {
  try {
    const ipfsAdd = await ipfs.files.add(fileBuffer);
    const ipfsHash = ipfsAdd[0].hash;
    await ipfs.pin.add(ipfsHash);
    return ipfsHash;
  } catch (err) {
    console.error(err);
  }
}

async function uploadIpld(metadata) {
  try {
    const ipld = await ipfs.dag.put(metadata, {
      format: 'dag-cbor',
      hashAlg: 'sha2-256',
    });
    const ipldHash = ipld.toBaseEncodedString();
    await ipfs.pin.add(ipldHash);
    return ipldHash;
  } catch (err) {
    console.error(err);
  }
}

function prepareIpld(obj, likeFingerprint) {
  const {
    dateCreated,
    description,
    license,
    likeOwner,
  } = obj;
  const metadata = {
    likeFingerprint,
    likeFootprint: [],
    likeIpldVersion: '0.1',
    likePreviousVersion: null,
    type: 'ImageObject',
    uploadDate: new Date().toISOString(),
    license: LICENSE[license],
    dateCreated,
    description,
    likeOwner,
    likeEscrow: 'likecoin-escrow',
  };
  return metadata;
}

function escapeCsvField(str) {
  return str.replace(/\"/g, "\"\"");
}

async function handleRecord(fileBuffer, jsonObj) {
  try {
    const ipfsHash = await uploadIpfs(fileBuffer);
    console.log(ipfsHash);
    const likeFingerprint = sha256(fileBuffer);
    const ipldHash = await uploadIpld(prepareIpld(jsonObj, likeFingerprint));
    console.log(ipldHash);
    const { height, width } = imageSize(fileBuffer);
    const nowTime = new Date().toISOString();
    const type = imageType(fileBuffer);
    const fpField = '\\x' + likeFingerprint;
    const ipfsField = '\\x' + bs58.decode(ipfsHash).toString('hex');
    const ipldField = '\\x' + bs58.decode(ipldHash).toString('hex');
    const {
      description,
      license,
      tags,
      sourceLink,
    } = jsonObj;
    if (!sourceLink) {
      sourceLink = 'NULL';
    }
    const wallet = '0x372cCcB5816CbcB0ee2Bc846ABad63BDf42BaCa8'; // likecoin-escrow address
    // output
    await appendFile(outAssetFile, `${nowTime},${fpField},${license},${ipfsField},${ipldField},${nowTime},${wallet},"${escapeCsvField(description)}",${height},${width},NULL,${type.ext},${sourceLink}\n`);
    for (let t in tags) {
      await appendFile(outAssetTagFile, `${fpField},"${escapeCsvField(tags[t])}"\n`);
    }
  } catch (err) {
    console.error(err);
  }
}

async function jsonCheck(lsJson) {
  for (let i in lsJson) {
    const jsonBuffer = await readFile(inPath + lsJson[i]);
    const jsonObj = JSON.parse(jsonBuffer);
    if (!('file' in jsonObj) || !('license' in jsonObj) || !('likeOwner' in jsonObj) || !('tags' in jsonObj)) {
      console.error(`Required field not found in ${lsJson[i]}`);
      return false;
    }
    const imgFile = jsonObj.file;
    const isExist = fs.existsSync(inPath + imgFile);
    if (!isExist) {
      console.error(`File ${imgFile} is not in ${inPath}, ${lsJson[i]}`);
      return false;
    }
    if (!LICENSE[jsonObj.license]) {
      console.error(`Unknown license value in ${lsJson[i]}`);
      return false;
    }
  }
  return true;
}

(async () => {
  const ls = await readdir(inPath);
  const lsJson = ls.filter(f => f.endsWith('.json'));
  if (await jsonCheck(lsJson)) {
    for (let i in lsJson) {
      const jsonBuffer = await readFile(inPath + lsJson[i]);
      const jsonObj = JSON.parse(jsonBuffer);
      const imgFile = jsonObj.file;
      const fileBuffer = await readFile(inPath + imgFile);
      await handleRecord(fileBuffer, jsonObj);
    }
  }
})();
