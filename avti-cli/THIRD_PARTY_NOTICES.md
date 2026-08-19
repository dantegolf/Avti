# Avti CLI — Third-Party Notices

Avti CLI is distributed with third-party open-source dependencies used by its terminal agent runtime.

The standalone Windows bundle is assembled from the production dependency tree of the `avti-cli` workspace. It intentionally excludes Avti Desktop and Electron.

Key upstream families include:

- DeepSeek Harness packages under the `@deepseek-ai/dsh-*` namespace;
- Cordis packages used by the Harness runtime;
- their transitive production dependencies.

The exact dependency versions are defined by `avti-cli/package.json` together with the repository `yarn.lock`, `resolutions`, and `patch:` entries. The portable bundle preserves the installed dependency packages, including their package metadata and license files where supplied by those packages.

This file is informational and does not replace the license text shipped by any dependency. The Avti project license is available in the repository root `LICENSE` file and is copied into the standalone Windows CLI artifact.

Desktop-only dependencies and notices, including Electron-specific components, belong to the Avti Desktop distribution and are not part of the intended Avti CLI production dependency boundary.
