import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { configureAvtiCliHome } from '../src/avti-cli.ts'

describe('Avti CLI home isolation', () => {
  it('uses a dedicated Avti CLI home by default', () => {
    const environment: NodeJS.ProcessEnv = {}
    expect(configureAvtiCliHome(environment)).toBe(join(homedir(), '.avti', 'cli'))
    expect(environment.DSH_HOME).toBe(join(homedir(), '.avti', 'cli'))
  })

  it('allows an Avti-specific home override', () => {
    const environment: NodeJS.ProcessEnv = { AVTI_CLI_HOME: 'C:\\AvtiCliState' }
    expect(configureAvtiCliHome(environment)).toBe('C:\\AvtiCliState')
    expect(environment.DSH_HOME).toBe('C:\\AvtiCliState')
  })

  it('respects an explicit Harness home override', () => {
    const environment: NodeJS.ProcessEnv = {
      AVTI_CLI_HOME: 'ignored',
      DSH_HOME: 'C:\\ExplicitHarnessHome',
    }
    expect(configureAvtiCliHome(environment)).toBe('C:\\ExplicitHarnessHome')
    expect(environment.DSH_HOME).toBe('C:\\ExplicitHarnessHome')
  })
})
