/** Avti update downloads are disabled until the project owns a signed release channel. */
import { extname, isAbsolute, resolve } from 'node:path'
import { compareSemVerVersions, parseSemVer } from './update-checker.ts'
export type DesktopDownloadPlatform='darwin'|'win32'
export const DESKTOP_DOWNLOAD_URLS:Readonly<Record<DesktopDownloadPlatform,string>>={darwin:'',win32:''}
export const MAX_UPDATE_DOWNLOAD_BYTES=1024*1024*1024
export type UpdateDownloadErrorCode='aborted'|'empty-body'|'http-status'|'invalid-artifact'|'invalid-options'|'network'|'response-too-large'
export type UpdateArtifactRequest=(url:string,init:RequestInit)=>Promise<Response>
export interface DownloadDesktopUpdateOptions{readonly platform:DesktopDownloadPlatform;readonly version:string;readonly destinationPath:string;readonly request:UpdateArtifactRequest;readonly signal?:AbortSignal}
export class UpdateDownloadError extends Error{readonly code:UpdateDownloadErrorCode;readonly status:number|undefined;constructor(code:UpdateDownloadErrorCode,message:string,options:{readonly status?:number;readonly cause?:unknown}={}){super(message,options.cause===undefined?undefined:{cause:options.cause});this.name='UpdateDownloadError';this.code=code;this.status=options.status}}
export interface DesktopUpdateArtifact{readonly platform:DesktopDownloadPlatform;readonly version:string;readonly path:string}
export async function downloadDesktopUpdate(_options:DownloadDesktopUpdateOptions):Promise<string>{throw new UpdateDownloadError('invalid-options','Avti automatic update downloads are disabled. Download releases from the Avti GitHub repository.')}
export function desktopUpdateFilename(platform:DesktopDownloadPlatform,version:string):string{validatedPlatform(platform);validatedVersion(version);const extension=platform==='darwin'?'dmg':'exe';const platformName=platform==='darwin'?'mac':'windows';return `Avti-${version}-${platformName}.${extension}`}
export async function recordDesktopUpdateArtifact(_userDataPath:string,_artifact:DesktopUpdateArtifact):Promise<void>{return}
export async function pendingDesktopUpdateArtifact(_userDataPath:string,_currentVersion:string,_platform:DesktopDownloadPlatform):Promise<DesktopUpdateArtifact|undefined>{return undefined}
export async function resolveDesktopUpdateArtifact(_userDataPath:string,_artifact:DesktopUpdateArtifact,_remove:boolean):Promise<void>{return}
function validatedPlatform(platform:DesktopDownloadPlatform):DesktopDownloadPlatform{if(platform!=='darwin'&&platform!=='win32')throw new UpdateDownloadError('invalid-options',`Unsupported update download platform: ${String(platform)}`);return platform}
function validatedVersion(version:string):string{const parsed=parseSemVer(version);if(parsed===null||parsed.prerelease.length>0||parsed.version!==version)throw new UpdateDownloadError('invalid-options','The update version must be stable Semantic Versioning.');return version}
export function _validateArtifactPath(path:string,platform:DesktopDownloadPlatform):string{if(path.length===0||/[\0\r\n]/u.test(path)||!isAbsolute(path))throw new UpdateDownloadError('invalid-options','The update destination path must be absolute.');const expected=platform==='darwin'?'.dmg':'.exe';if(extname(path).toLowerCase()!==expected)throw new UpdateDownloadError('invalid-options',`The update destination must use ${expected}.`);return resolve(path)}
void compareSemVerVersions
