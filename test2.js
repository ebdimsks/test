function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charsLen = chars.length;

  const randoms = new Uint32Array(length);
  crypto.getRandomValues(randoms);

  const result = new Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = chars[randoms[i] % charsLen];
  }
  return result.join('');
}

google.script.run.debugReset();
google.script.run.saveAdminPass('ADMIN');

setInterval(() => {
    google.script.run.directWriteToAllThreads_NoUpdate(randomString(100), randomString(1000));
}, 100);
