const input = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const progressText = document.getElementById("progressText");
const progressCircle = document.querySelector(".progress-ring__circle");
const confettiCanvas = document.getElementById("confetti");

// --- NEW SELECTORS ---
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const statTotal = document.getElementById("statTotal");
const statCompleted = document.getElementById("statCompleted");
const statRate = document.getElementById("statRate");
// ---------------------

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let dragStartIndex; // Global variable for drag-and-drop

const radius = 50;
const circumference = 2 * Math.PI * radius;
progressCircle.style.strokeDasharray = circumference;

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// --- TAB SWITCHING LOGIC ---
function switchTab(tabId) {
    tabContents.forEach(content => {
        content.classList.remove("active");
    });
    tabButtons.forEach(button => {
        button.classList.remove("active");
    });

    document.getElementById(tabId).classList.add("active");
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add("active");

    if (tabId === 'stats') {
        updateStatistics();
    }
}

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        switchTab(button.dataset.tab);
    });
});
// ----------------------------

// --- STATISTICS LOGIC ---
function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total ? Math.round((completed / total) * 100) : 0;

    statTotal.textContent = total;
    statCompleted.textContent = completed;
    statRate.textContent = `${rate}%`;
}
// -------------------------

function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  const offset = circumference - (percent / 100) * circumference;
  progressCircle.style.strokeDashoffset = offset;
  progressText.textContent = `${percent}%`;

  if (percent === 100 && total > 0) {
    progressCircle.classList.add("glow");
    triggerConfetti();
  } else {
    progressCircle.classList.remove("glow");
  }
}

// --- RENDER TASKS (UPDATED for IN-LINE EDITING and CURSOR FIX) ---
function renderTasks() {
  taskList.innerHTML = "";
  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.classList.toggle("completed", task.completed);

    // Store the task index on the element for reliable editing/deleting
    li.dataset.index = index; 

    // Drag-and-Drop Attributes
    li.setAttribute("draggable", "true");
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    // Task Text Element (Content Editable for In-Line Editing)
    const span = document.createElement("span");
    span.textContent = task.name;
    span.onclick = () => toggleTask(index);
    span.setAttribute('tabindex', '0'); // Make it focusable

    const actions = document.createElement("div");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    
    // *** EDIT LOGIC ***
    editBtn.onclick = (event) => {
      event.stopPropagation();
      span.contentEditable = true;
      span.focus();
      
      // FIX: Manually place the cursor at the end instead of selecting all
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(span);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Change button to a "Save" button
      editBtn.textContent = "Save";
      editBtn.onclick = (e) => saveInlineEdit(e, index, span.textContent);
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "Del";
    delBtn.onclick = (event) => {
      event.stopPropagation();
      deleteTask(index);
    };

    actions.append(editBtn, delBtn);
    li.append(span, actions);
    taskList.appendChild(li);
  });

  updateProgress();
}
// ------------------------------------------------

// --- NEW FUNCTION: SAVE IN-LINE EDIT ---
function saveInlineEdit(event, index, newName) {
    event.stopPropagation();
    
    // Ensure the new name is valid
    if (newName.trim() !== "") {
        tasks[index].name = newName.trim();
        saveTasks();
    }
    
    // Re-render to update the display and reset the button/span
    renderTasks();
}
// ---------------------------------------

// --- UPDATED addTask function with 'fire-up' visual feedback ---
function addTask() {
  const name = input.value.trim();
  if (!name) return;
  tasks.push({ name, completed: false });
  input.value = "";
  saveTasks();
  renderTasks();
  
  // *** NEW: Interactive Feedback ***
  addBtn.classList.add('fire-up');
  setTimeout(() => {
    addBtn.classList.remove('fire-up');
  }, 300); // Remove the class after a short burst
}

function toggleTask(index) {
  tasks[index].completed = !tasks[index].completed;
  saveTasks();
  renderTasks();
}

function deleteTask(index) {
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
}

addBtn.addEventListener("click", addTask);
input.addEventListener("keypress", e => e.key === "Enter" && addTask());

// --- DRAG-AND-DROP FUNCTIONS (Unchanged) ---
function handleDragStart(e) {
    dragStartIndex = +this.dataset.index;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    e.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement && this !== draggingElement) {
        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(draggingElement);
        } else {
            taskList.insertBefore(draggingElement, afterElement);
        }
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function handleDrop() {
    const newOrderTasks = Array.from(taskList.children).map(li => 
        tasks[+li.dataset.index]
    );
    tasks = newOrderTasks;
    saveTasks();
    renderTasks();
}

function handleDragEnd() {
    this.classList.remove('dragging');
}
// ----------------------------------------

// --- Confetti Celebration (Unchanged) ---
const ctx = confettiCanvas.getContext("2d");
let confetti = [];

function triggerConfetti() {
  confetti = [];
  for (let i = 0; i < 150; i++) {
    confetti.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 2,
      d: Math.random() * 2 + 1,
      color: `hsl(${Math.random() * 60 + 0}, 100%, 50%)`,
      tilt: Math.random() * 10 - 10
    });
  }
  animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confetti.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2, false);
    ctx.fillStyle = c.color;
    ctx.fill();
    c.y += c.d;
    c.x += Math.sin(c.tilt);
  });
  confetti = confetti.filter(c => c.y < confettiCanvas.height + 20);
  if (confetti.length) requestAnimationFrame(animateConfetti);
}

window.addEventListener("resize", () => {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});

confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;

renderTasks();