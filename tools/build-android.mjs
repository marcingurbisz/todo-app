import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sdkRoot = resolve(process.env.ANDROID_SDK_ROOT || join(projectRoot, '.android-sdk'));
const shouldInstall = process.argv.includes('--install');

const commandLineTools = {
  linux: {
    url: 'https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip',
    sha256: '4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583'
  }
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || projectRoot,
    env: options.env || process.env,
    input: options.input,
    stdio: options.input ? ['pipe', 'inherit', 'inherit'] : 'inherit'
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function javaMajor() {
  const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', 'java') : 'java';
  const result = spawnSync(java, ['-version'], { encoding: 'utf8' });
  const version = `${result.stdout || ''}${result.stderr || ''}`.match(/version "(\d+)/)?.[1];
  return version ? Number(version) : null;
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  await pipeline(response.body, createWriteStream(destination));
}

async function sha256(path) {
  const hash = createHash('sha256');
  hash.update(await readFile(path));
  return hash.digest('hex');
}

async function ensureAndroidSdk() {
  const androidCli = join(sdkRoot, 'cmdline-tools', 'latest', 'bin', 'android');
  if (!existsSync(androidCli)) {
    const downloadSpec = commandLineTools[process.platform];
    if (!downloadSpec || process.arch !== 'x64') {
      throw new Error(
        'Automatic Android SDK setup supports Linux x64. Set ANDROID_SDK_ROOT on this platform.'
      );
    }

    console.log('Android SDK is missing; downloading verified command-line tools...');
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'todo-app-android-sdk-'));
    const archive = join(temporaryRoot, 'command-line-tools.zip');
    const extracted = join(temporaryRoot, 'extracted');
    try {
      await download(downloadSpec.url, archive);
      if ((await sha256(archive)) !== downloadSpec.sha256) {
        throw new Error('Downloaded Android command-line tools checksum does not match.');
      }
      await mkdir(extracted, { recursive: true });
      run('unzip', ['-q', archive, '-d', extracted]);
      await mkdir(join(sdkRoot, 'cmdline-tools'), { recursive: true });
      await rm(join(sdkRoot, 'cmdline-tools', 'latest'), { recursive: true, force: true });
      await cp(join(extracted, 'cmdline-tools'), join(sdkRoot, 'cmdline-tools', 'latest'), {
        recursive: true
      });
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }

  const androidEnv = {
    ...process.env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    PATH: `${join(sdkRoot, 'platform-tools')}:${process.env.PATH}`
  };
  run(
    androidCli,
    [
      '--no-metrics',
      'sdk',
      'install',
      'platform-tools@37.0.0',
      'platforms/android-36@2.0.0',
      'build-tools/36.0.0@36.0.0'
    ],
    { env: androidEnv, input: `${'y\n'.repeat(20)}` }
  );

  return androidEnv;
}

async function main() {
  const currentJava = javaMajor();
  if (!currentJava || currentJava < 17 || currentJava > 25) {
    throw new Error(
      `Gradle 9.1 requires JDK 17 through 25; current Java major is ${currentJava || 'unknown'}.`
    );
  }
  console.log(`Using the available JDK ${currentJava}.`);
  const androidEnv = await ensureAndroidSdk();
  await writeFile(
    join(projectRoot, 'android', 'local.properties'),
    `sdk.dir=${sdkRoot.replaceAll('\\', '\\\\')}\n`
  );

  run('npm', ['run', 'android:sync'], { env: androidEnv });
  run(join(projectRoot, 'android', 'gradlew'), ['assembleDebug'], {
    cwd: join(projectRoot, 'android'),
    env: androidEnv
  });

  const apk = join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  console.log(`Debug APK ready: ${apk}`);

  if (shouldInstall) {
    run(join(sdkRoot, 'platform-tools', 'adb'), ['install', '-r', apk], {
      env: androidEnv
    });
  }
}

main().catch((error) => {
  console.error(`Android build failed: ${error.message}`);
  process.exitCode = 1;
});
