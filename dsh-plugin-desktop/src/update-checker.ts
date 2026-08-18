/** Avti does not consume the upstream DSH Desktop update service. */
export const DESKTOP_VERSION_ENDPOINT = ''
export const MAX_VERSION_RESPONSE_BYTES = 4 * 1024
export interface ParsedSemVer { readonly version:string; readonly major:string; readonly minor:string; readonly patch:string; readonly prerelease:readonly string[]; readonly build:readonly string[] }
export type UpdateRequest=(url:string,init:RequestInit)=>Promise<Response>
export interface UpdateCheckOptions { readonly currentVersion:string; readonly signal?:AbortSignal; readonly request?:UpdateRequest }
export type UpdateCheckResult={readonly status:'up-to-date'|'update-available';readonly currentVersion:string;readonly latestVersion:string}
const SEMVER_PATTERN=/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/u
export function parseSemVer(input:string):ParsedSemVer|null{const version=input.startsWith('v')?input.slice(1):input;const match=SEMVER_PATTERN.exec(version);if(match===null)return null;const prerelease=match[4]?.split('.')??[];if(prerelease.some(i=>/^[0-9]+$/u.test(i)&&i.length>1&&i.startsWith('0')))return null;return{version,major:match[1]!,minor:match[2]!,patch:match[3]!,prerelease,build:match[5]?.split('.')??[]}}
export function compareSemVerVersions(left:string,right:string):number|null{const a=parseSemVer(left),b=parseSemVer(right);if(a===null||b===null)return null;for(const k of ['major','minor','patch'] as const){const x=BigInt(a[k]),y=BigInt(b[k]);if(x<y)return-1;if(x>y)return 1}if(a.prerelease.length===0)return b.prerelease.length===0?0:1;if(b.prerelease.length===0)return-1;return a.version.localeCompare(b.version)}
/** Updates are intentionally disabled until Avti publishes its own signed release feed. */
export async function checkForStableUpdate(_options:UpdateCheckOptions):Promise<UpdateCheckResult|null>{return null}
