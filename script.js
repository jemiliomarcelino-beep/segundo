const DB_NAME = "NossoCantinhoDB";
const STORE = "memorias";
let db;
const gallery = document.getElementById("gallery");
const notesList = document.getElementById("notesList");
const toast = document.getElementById("toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function storeRequest(mode, callback) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = callback(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function getMemories() { return (await storeRequest("readonly", s => s.getAll())).sort((a,b) => b.id-a.id); }
async function addMemory(file) {
  await storeRequest("readwrite", s => s.add({ name:file.name, type:file.type, blob:file, date:new Date().toISOString() }));
}
async function deleteMemory(id) { await storeRequest("readwrite", s => s.delete(Number(id))); renderMemories(); showToast("Memória removida."); }

function makeMediaCard(item) {
  const card = document.createElement("article"); card.className = "memory-card";
  const url = URL.createObjectURL(item.blob);
  let media;
  if (item.type.startsWith("image/")) {
    media = document.createElement("img"); media.src = url; media.alt = item.name; media.loading = "lazy";
  } else if (item.type.startsWith("video/")) {
    media = document.createElement("video"); media.src = url; media.controls = true; media.preload = "metadata";
  } else {
    media = document.createElement("audio"); media.src = url; media.controls = true; media.preload = "metadata";
  }
  card.appendChild(media);
  const info = document.createElement("div"); info.className = "memory-info";
  const name = document.createElement("strong"); name.textContent = item.name;
  const del = document.createElement("button"); del.className = "delete-btn"; del.textContent = "Apagar"; del.setAttribute("aria-label", "Apagar " + item.name);
  del.addEventListener("click", () => deleteMemory(item.id));
  info.append(name, del); card.appendChild(info);
  return card;
}
async function renderMemories() {
  const items = await getMemories();
  gallery.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    empty.innerHTML = '<span>♡</span><h3>A vossa história começa aqui</h3><p>Adiciona a primeira fotografia, vídeo ou áudio.</p>';
    gallery.appendChild(empty);
  } else items.forEach(item => gallery.appendChild(makeMediaCard(item)));
  document.getElementById("countMedia").textContent = items.length;
  document.getElementById("mediaLabel").textContent = `${items.length} ${items.length === 1 ? "item" : "itens"}`;
}
async function handleFiles(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  try {
    for (const file of files) {
      if (file.size > 150 * 1024 * 1024) { showToast(`${file.name} excede 150 MB e foi ignorado.`); continue; }
      await addMemory(file);
    }
    await renderMemories();
    showToast("Memória guardada neste dispositivo!");
  } catch (error) {
    console.error(error); showToast("Não foi possível guardar. Verifica o espaço disponível.");
  }
  input.value = "";
}
document.getElementById("photoInput").addEventListener("change", e => handleFiles(e.target));
document.getElementById("videoInput").addEventListener("change", e => handleFiles(e.target));
document.getElementById("audioInput").addEventListener("change", e => handleFiles(e.target));

function getNotes() {
  try { return JSON.parse(localStorage.getItem("nossoCantinhoNotas") || "[]"); }
  catch { return []; }
}
function saveNotes(notes) { localStorage.setItem("nossoCantinhoNotas", JSON.stringify(notes)); }
function renderNotes() {
  const notes = getNotes(); notesList.replaceChildren();
  document.getElementById("countNotes").textContent = notes.length;
  if (!notes.length) { const p = document.createElement("p"); p.className = "no-notes"; p.textContent = "Ainda não há mensagens. Escreve a primeira carta de amor."; notesList.appendChild(p); return; }
  notes.forEach(note => {
    const card = document.createElement("article"); card.className = "note-card";
    const del = document.createElement("button"); del.className = "delete-btn"; del.textContent = "Apagar";
    del.addEventListener("click", () => { saveNotes(getNotes().filter(n => n.id !== note.id)); renderNotes(); showToast("Mensagem apagada."); });
    const title = document.createElement("h4"); title.textContent = note.title;
    const body = document.createElement("p"); body.textContent = note.text;
    const date = document.createElement("span"); date.className = "note-date"; date.textContent = note.date;
    card.append(del, title, body, date); notesList.appendChild(card);
  });
}
const noteText = document.getElementById("noteText");
noteText.addEventListener("input", () => document.getElementById("charCount").textContent = `${noteText.value.length} / 2000`);
document.getElementById("noteForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("noteTitle").value.trim();
  const text = noteText.value.trim();
  if (!title || !text) return;
  const notes = getNotes();
  notes.unshift({ id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), title, text, date: new Date().toLocaleDateString("pt-PT", { day:"2-digit", month:"long", year:"numeric" }) });
  try { saveNotes(notes); e.target.reset(); document.getElementById("charCount").textContent = "0 / 2000"; renderNotes(); showToast("A vossa mensagem foi guardada!"); }
  catch { showToast("Não foi possível guardar. O armazenamento pode estar cheio."); }
});
document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.getElementById("themeBtn").textContent = document.body.classList.contains("dark") ? "☀" : "☾";
});
document.getElementById("year").textContent = new Date().getFullYear();

(async function init() {
  try { db = await openDB(); await renderMemories(); }
  catch (e) { console.error(e); showToast("O navegador não permitiu abrir o álbum. Tenta usar o Chrome."); }
  renderNotes();
})();
