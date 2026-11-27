// Decode the existing personal signing key only into the ephemeral CI temp folder.
const fs=require('node:fs');
const path=require('node:path');
const data=process.env.COSMO_ANDROID_KEYSTORE_B64;
if(!data || !process.env.COSMO_ANDROID_STORE_PASSWORD)throw Error('Configure the Android signing Actions Secrets before building an installable release.');
const root=process.env.RUNNER_TEMP;
if(!root)throw Error('RUNNER_TEMP is required.');
const destination=path.join(root,'cosmo-personal.jks');
fs.writeFileSync(destination,Buffer.from(data,'base64'),{mode:0o600});
fs.appendFileSync(process.env.GITHUB_ENV,`COSMO_ANDROID_KEYSTORE_PATH=${destination}\n`);
console.log('Personal Android signing key prepared in runner temporary storage.');
