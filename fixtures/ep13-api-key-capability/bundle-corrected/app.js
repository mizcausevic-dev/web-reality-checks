// CORRECTED browser bundle. The only credential-like value here is the public identifier.
// It names the project; it authorises nothing. Privileged work goes through the application
// backend, which holds the server secret in its own configuration and never returns it.
const PUBLIC_PROJECT_ID = "proj_pub_7f3a21";
const BACKEND = ""; // same origin as this page

async function loadProject() {
  // Public info can be read via the backend (or directly from a public endpoint); no secret involved.
  const r = await fetch(`${BACKEND}/project`);
  document.getElementById("project").textContent = `${PUBLIC_PROJECT_ID}: ${JSON.stringify(await r.json())}`;
}

async function rotateWebhook() {
  // The browser asks the backend to perform a named operation. Identity comes from the
  // session cookie; the backend decides whether this user may do it.
  const r = await fetch(`${BACKEND}/privileged`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({operation: "rotate_webhook"}),
  });
  document.getElementById("result").textContent = `${r.status} ${JSON.stringify(await r.json())}`;
}

document.getElementById("rotate").addEventListener("click", rotateWebhook);
loadProject();
