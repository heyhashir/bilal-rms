import net from "net";
import { spawnSync } from "child_process";

const [host = "127.0.0.1", portValue = "3307", timeoutValue = "60000", label = "service", containerName = ""] = process.argv.slice(2);
const port = Number(portValue);
const timeoutMs = Number(timeoutValue);
const startedAt = Date.now();
const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";

const tryConnect = () =>
  new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.once("connect", () => {
      socket.end();
      resolve();
    });

    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });

    socket.setTimeout(2000, () => {
      socket.destroy();
      reject(new Error("Timed out"));
    });
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getContainerState = () => {
  if (!containerName) {
    return null;
  }

  const result = spawnSync(
    dockerCommand,
    ["inspect", "-f", "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}", containerName],
    {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
      shell: false,
    },
  );

  if (result.status !== 0) {
    return {
      exists: false,
      status: "missing",
      health: "missing",
    };
  }

  const [status = "unknown", health = "none"] = result.stdout.trim().split("|");
  return {
    exists: true,
    status,
    health,
  };
};

while (Date.now() - startedAt < timeoutMs) {
  try {
    const containerState = getContainerState();
    if (containerState) {
      if (!containerState.exists) {
        await sleep(1000);
        continue;
      }

      if (containerState.status !== "running") {
        await sleep(1000);
        continue;
      }

      if (containerState.health !== "healthy" && containerState.health !== "none") {
        await sleep(1000);
        continue;
      }
    }

    await tryConnect();
    console.log(`${label} is reachable on ${host}:${port}.`);
    process.exit(0);
  } catch {
    await sleep(1000);
  }
}

console.error(`Timed out waiting for ${label} on ${host}:${port}.`);
process.exit(1);
