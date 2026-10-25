// FLAWED browser bundle (deliberately). This is what a build step produced after someone
// put both "keys" in the same front-end environment block. Both values are SYNTHETIC.
//
// The browser talks to the fictional upstream directly and presents the server secret itself.
const PUBLIC_PROJECT_ID = "proj_pub_7f3a21";
const SERVER_SECRET_TOKEN = "srv_secret_SYNTHETIC_9c1e4b7d2f60a3"; // <-- anyone who loads this page now holds this
const UPSTREAM = window.__UPSTREAM__ || "http://127.0.0.1:0";

async function loadProject() {
  const r = await fetch(`${UPSTREAM}/public/${PUBLIC_PROJECT_ID}`);
  document.getElementById("project").textContent = JSON.stringify(await r.json());
}

async function rotateWebhook() {
  // Privileged operation performed FROM THE BROWSER with the embedded secret.
  const r = await fetch(`${UPSTREAM}/privileged`, {
    method: "POST",
    headers: {"content-type": "application/json", authorization: `Bearer ${SERVER_SECRET_TOKEN}`},
    body: JSON.stringify({operation: "rotate_webhook", projectId: PUBLIC_PROJECT_ID}),
  });
  document.getElementById("result").textContent = `${r.status} ${JSON.stringify(await r.json())}`;
}

document.getElementById("rotate").addEventListener("click", rotateWebhook);
loadProject();
