import { exec } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface DockerContainerConfig {
  id: string;
  name: string;
  port: number;
  gatewayToken: string;
}

export interface ContainerStatus {
  running: boolean;
  containerId?: string;
  error?: string;
}

export class DockerService {
  private readonly OPENCLAW_IMAGE = 'openclaw:local';
  private readonly INSTANCES_BASE_PATH = '/var/www/devalliance/openclaw-containers/instances';
  private readonly NETWORK_NAME = 'devalliance_network';

  /**
   * Get the next available port starting from 18795
   */
  async getNextAvailablePort(): Promise<number> {
    try {
      const dirs = await fs.readdir(this.INSTANCES_BASE_PATH);
      const ports: number[] = [];

      for (const dir of dirs) {
        const configPath = path.join(this.INSTANCES_BASE_PATH, dir, 'config.json');
        try {
          const content = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(content);
          if (config.port) {
            ports.push(config.port);
          }
        } catch {
          // Skip if config doesn't exist or is invalid
        }
      }

      // Find first available port starting from 18795
      let port = 18795;
      while (ports.includes(port)) {
        port++;
      }

      return port;
    } catch (error) {
      // If instances directory doesn't exist or error, start from 18795
      return 18795;
    }
  }

  /**
   * Generate a random gateway token
   */
  generateGatewayToken(): string {
    return randomBytes(24).toString('hex');
  }

  /**
   * Create instance directory and configuration
   */
  async createInstanceDirectory(config: DockerContainerConfig): Promise<void> {
    const instancePath = path.join(this.INSTANCES_BASE_PATH, config.id);

    // Create instance directory
    await fs.mkdir(instancePath, { recursive: true });

    // Create openclaw root directory (will be mounted as /home/node/.openclaw)
    const openclawDir = path.join(instancePath, '.openclaw');
    await fs.mkdir(openclawDir, { recursive: true });
    
    // Create subdirectories inside .openclaw
    await fs.mkdir(path.join(openclawDir, 'workspace'), { recursive: true });
    await fs.mkdir(path.join(openclawDir, 'config'), { recursive: true });
    // Pre-create canvas and cron dirs to avoid EACCES errors
    await fs.mkdir(path.join(openclawDir, 'canvas'), { recursive: true });
    await fs.mkdir(path.join(openclawDir, 'cron'), { recursive: true });

    // Create config.json
    const configData = {
      agentId: config.id,
      name: config.name,
      port: config.port,
      gatewayToken: config.gatewayToken,
      createdAt: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(instancePath, 'config.json'),
      JSON.stringify(configData, null, 2)
    );

    // Create .env file for container
    const envContent = `OPENCLAW_GATEWAY_TOKEN=${config.gatewayToken}
OPENCLAW_AGENT_ID=${config.id}
OPENCLAW_GATEWAY_PORT=${config.port}
ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}
`;

    await fs.writeFile(
      path.join(instancePath, '.env'),
      envContent
    );

    // Create openclaw.json config file
    const openclawConfig = {
      gateway: {
        bind: 'lan',
        port: config.port,
        mode: 'local'
      },
      skillsPaths: [
        '/home/node/.openclaw/workspace/skills'
      ]
    };

    await fs.writeFile(
      path.join(openclawDir, 'config', 'openclaw.json'),
      JSON.stringify(openclawConfig, null, 2)
    );

    // Set correct ownership (UID 1000 = user 'node' inside container)
    try {
      await execAsync(`chown -R 1000:1000 ${openclawDir}`);
    } catch (error) {
      console.error(`Warning: Could not set ownership for ${openclawDir}:`, error);
      // Don't throw - ownership issues are not fatal
    }
  }

  /**
   * Remove instance directory
   */
  async removeInstanceDirectory(agentId: string): Promise<void> {
    const instancePath = path.join(this.INSTANCES_BASE_PATH, agentId);
    try {
      await fs.rm(instancePath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Error removing instance directory for ${agentId}:`, error);
      // Don't throw - allow deletion to continue even if directory removal fails
    }
  }

  /**
   * Create and start a Docker container for an agent
   */
  async createContainer(config: DockerContainerConfig): Promise<void> {
    const containerName = `openclaw-${config.id}`;
    const instancePath = path.join(this.INSTANCES_BASE_PATH, config.id);
    const openclawDir = path.join(instancePath, '.openclaw');

    // Create instance directory first
    await this.createInstanceDirectory(config);

    try {
      // Build docker run command
      // Mount entire .openclaw directory to avoid permission issues
      // Configuration is handled via openclaw.json and env vars
      const dockerCmd = [
        'docker run -d',
        `--name ${containerName}`,
        '--network host',
        `-v ${openclawDir}:/home/node/.openclaw`,
        '-v /var/www/devalliance/openclaw-containers/skills:/home/node/.openclaw/workspace/skills:ro',
        `--env-file ${instancePath}/.env`,
        '--restart unless-stopped',
        this.OPENCLAW_IMAGE
      ].join(' ');

      const { stdout } = await execAsync(dockerCmd);
      console.log(`Container ${containerName} created:`, stdout.trim());
    } catch (error) {
      // If container creation fails, clean up the instance directory
      await this.removeInstanceDirectory(config.id);
      throw new Error(`Failed to create container: ${(error as Error).message}`);
    }
  }

  /**
   * Start an existing container
   */
  async startContainer(agentId: string): Promise<void> {
    const containerName = `openclaw-${agentId}`;
    try {
      await execAsync(`docker start ${containerName}`);
      console.log(`Container ${containerName} started`);
    } catch (error) {
      throw new Error(`Failed to start container: ${(error as Error).message}`);
    }
  }

  /**
   * Stop a running container
   */
  async stopContainer(agentId: string): Promise<void> {
    const containerName = `openclaw-${agentId}`;
    try {
      await execAsync(`docker stop ${containerName}`);
      console.log(`Container ${containerName} stopped`);
    } catch (error) {
      throw new Error(`Failed to stop container: ${(error as Error).message}`);
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(agentId: string): Promise<void> {
    const containerName = `openclaw-${agentId}`;
    try {
      await execAsync(`docker restart ${containerName}`);
      console.log(`Container ${containerName} restarted`);
    } catch (error) {
      throw new Error(`Failed to restart container: ${(error as Error).message}`);
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(agentId: string): Promise<void> {
    const containerName = `openclaw-${agentId}`;
    try {
      // Stop container first if running
      await execAsync(`docker stop ${containerName}`).catch(() => {
        // Ignore if container is already stopped
      });

      // Remove container
      await execAsync(`docker rm ${containerName}`);
      console.log(`Container ${containerName} removed`);

      // Remove instance directory
      await this.removeInstanceDirectory(agentId);
    } catch (error) {
      throw new Error(`Failed to remove container: ${(error as Error).message}`);
    }
  }

  /**
   * Get container status
   */
  async getContainerStatus(agentId: string): Promise<ContainerStatus> {
    const containerName = `openclaw-${agentId}`;
    try {
      const { stdout } = await execAsync(
        `docker inspect --format='{{.State.Running}}' ${containerName}`
      );
      const running = stdout.trim() === 'true';

      const { stdout: idOutput } = await execAsync(
        `docker inspect --format='{{.Id}}' ${containerName}`
      );

      return {
        running,
        containerId: idOutput.trim()
      };
    } catch (error) {
      return {
        running: false,
        error: 'Container not found'
      };
    }
  }

  /**
   * Check if network exists, create if not
   */
  async ensureNetworkExists(): Promise<void> {
    try {
      await execAsync(`docker network inspect ${this.NETWORK_NAME}`);
    } catch {
      // Network doesn't exist, create it
      try {
        await execAsync(`docker network create ${this.NETWORK_NAME}`);
        console.log(`Created Docker network: ${this.NETWORK_NAME}`);
      } catch (error) {
        console.error(`Failed to create network: ${(error as Error).message}`);
      }
    }
  }
}
