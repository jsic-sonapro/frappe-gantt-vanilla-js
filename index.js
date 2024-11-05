import Gantt from "frappe-gantt";
import {client} from "./utils/fetchWrapper.js";
import {months} from "./constants.js";
import {createFormattedDateFromStr} from "./utils/dateFunctions.js";

let ganttChart;
let tasks;

const addForm = document.getElementById("add-task");
const deleteForm = document.getElementById("delete-tasks");
const tasksCheckBoxContainers = document.querySelectorAll(".tasks-checkbox-container");
const msgEl = document.querySelector(".delete-msg");

async function fetchData() {
    client("data/data.json").then(
        (data) => {
            tasks = data;
            ganttChart = new Gantt("#gantt", tasks, {
                bar_height: 20,
                
                view_mode: "Week",
                // custom_popup_html: function (task) {
                //         const start_day = task._start.getDate();
                //         const start_month = months[task._start.getMonth()];
                //         const end_day = task._end.getDate();
                //         const end_month= months[task._end.getMonth()];
                //         console.log(task.progress);
                //         return `
                //         <div class='details-container'>
                //             <h5>${task.name}</h5>
                //             <br>
                //             <p>Task started on: ${start_day} ${start_month}</p>
                //             <p>Expected to finish by ${end_day} ${end_month}</p>
                //             <p>${task.progress}% completed!</p>
                //             <label for"setProgress">Progress</label>
                //             <input class="input-popup" id="setProgress" value="${task.progress}"></input>
                //         </div>`;
                // },
                on_click: function(task) {
                    console.log(task);
                },
                on_date_change: function (task, start, end) {
                    updateDate(task, start, end);
                },
                on_progress_change: function (task, progress) {
                    updateProgress(task, progress);
                }
            });
            showGantt();
            addTaskCheckBoxes();
        },
        (error) => {
            showErrorMsg();
        },
        hideLoader()
    );
}

function hideLoader() {
    document.getElementsByClassName("loading")[0].style.display = "none";
}

function showGantt() {
    document.getElementsByClassName("gantt-wrapper")[0].style.display = "block";
}

function showErrorMsg() {
    document.getElementsByClassName("error")[0].style.display = "flex";
}

function createPopup(task) {
    const start_day = task._start.getDate();
    const start_month = months[task._start.getMonth()];
    const end_day = task._end.getDate();
    const end_month= months[task._end.getMonth()];
    
    const popup = document.createElement("div");
    
    const header = document.createElement("h5");
    const spacer = document.createElement("br");
    const startLine = document.createElement("p");
    const endLine = document.createElement("p");
    const progressLine = document.createElement("p");
    const progressInputLabel = document.createElement("label");
    const progressInput = document.createElement("input");
    const deleteButton = document.createElement("button");

    popup.setAttribute('class', 'details-container');
    header.appendChild(document.createTextNode(`${task.name}`));
    startLine.appendChild(document.createTextNode(`TEST Task started on: ${start_day} ${start_month}`));
    endLine.appendChild(document.createTextNode(`Expected to finish by ${end_day} ${end_month}`));
    progressLine.appendChild(document.createTextNode(`${task.progress}% completed!`));
    progressInputLabel.setAttribute('for', 'setProgress');
    progressInputLabel.appendChild(document.createTextNode(`Progress`));
    progressInput.setAttribute('class', 'input-popup');
    progressInput.setAttribute('id', 'setProgress');
    progressInput.setAttribute('value', `${task.progress}`);
    deleteButton.setAttribute('class', 'button-popup');
    //deleteButton.onclick = deleteTask(task);

    popup.appendChild(header);
    popup.appendChild(spacer);
    popup.appendChild(startLine);
    popup.appendChild(endLine);
    popup.appendChild(progressLine);
    popup.appendChild(progressInputLabel);
    popup.appendChild(progressInput);
    popup.appendChild(deleteButton);
    return popup;//popup;
                    // <div class='details-container'>
                    //     <h5>${task.name}</h5>
                    //     <br>
                    //     <p>Task started on: ${start_day} ${start_month}</p>
                    //     <p>Expected to finish by ${end_day} ${end_month}</p>
                    //     <p>${task.progress}% completed!</p>
                    //     <label for"setProgress">Progress</label>
                    //     <input class="input-popup" id="setProgress" value="${task.progress}"></input>
                    //     <button class="button-popup" onclick="${deleteTask(task)}">Delete</button>
                    // </div>
}

function addTask(e) {
    e.preventDefault();
    const formElements = e.target.elements;
    const name = formElements["task-name"].value;
    const start = formElements["start-date"].value;
    const end = formElements["end-date"].value;
    const progress = parseInt(formElements["progress"].value);
    const isImportant = formElements["is-important"].checked;
    const taskCheckBoxes = formElements["task"];
    console.log(taskCheckBoxes);
    const timeDiff = new Date(end).getTime() - new Date(start).getTime();
    if (timeDiff <= 0) return;
    const dependencieIds = [];
    if (tasks.length === 1) {
        if (taskCheckBoxes.checked) {
            dependencieIds.push(taskCheckBoxes.id);
        }
    }
    else {
        taskCheckBoxes.forEach((dep) => {
            if (dep.checked) {
                dependencieIds.push(dep.id);
            }
        });
    }
    const newTask = {
        id: `${Date.now()}`,
        name,
        start,
        end,
        progress,
        custom_class: isImportant ? "is-important" : "",
        dependencies: dependencieIds.join(", "),
    };
    tasks.push(newTask);
    ganttChart.refresh(tasks);
    msgEl.style.display = "none";
}

function deleteTask(task) {
    console.log("deleted", task.name);
}

function deleteTasks(e) {
    e.preventDefault();
    const formElements = e.target.elements;
    const taskCheckBoxes = formElements["task"];
    if (tasks.length === 1) {
        msgEl.style.display = "block";
        return;
    }
    const taskIds = [];
    taskCheckBoxes.forEach((task) => {
        if (task.checked) {
            taskIds.push(task.id);
        }
    });
    if (taskIds.length === 0) return;
    if (taskIds.length === tasks.length) {
        msgEl.style.display = "block";
        return;
    }

    const filteredTasks = tasks.filter((task) => !taskIds.includes(task.id));
    const newTasks = filteredTasks.map((tsk) => {
        if (tsk.dependencies.length == 0) {
            return tsk;
        }
        const dependenciesArray = tsk.dependencies;
        const newDependencies = dependenciesArray.filter((dep) => !taskIds.includes(dep));
        return {
            ...tsk,
            dependencies: newDependencies,
        };
    });
    tasks = newTasks;
    ganttChart.refresh(tasks);
    addTaskCheckBoxes();
    msgEl.style.display = "none";
}

function updateDate(task, start, end) {
    const startYear = start.getFullYear();
    const startMonth = start.getMonth();
    const startDay = start.getDate();
    const endYear = end.getFullYear();
    const endMonth = end.getMonth();
    const endDay = end.getDate();
    
    const startStr = createFormattedDateFromStr(
        startYear,
        startMonth + 1,
        startDay
    );
    const endStr = createFormattedDateFromStr(
        endYear, 
        endMonth + 1,
        endDay
    );
    const taskToUpdate = tasks.find((tsk) => tsk.id === task.id);
    taskToUpdate.start = startStr;
    taskToUpdate.end = endStr;
    ganttChart.refresh(tasks);
    addTaskCheckBoxes();
}

function updateProgress(task, progress) {
    const taskToUpdate = tasks.find((tsk) => tsk.id === task.id);
    taskToUpdate.progress = progress;
    ganttChart.refresh(tasks);
}

function addTaskCheckBoxes() {
    tasksCheckBoxContainers.forEach((container, i) => {
        container.innerHTML = "";
        const fragment = new DocumentFragment();
        const legend = document.createElement("legend");
        if (i === 0) {
            legend.appendChild(document.createTextNode("Dependencies"));
        }
        else {
            legend.appendChild(document.createTextNode("Tasks"));
        }
        fragment.appendChild(legend);
        tasks.map((task) => {
            const div = document.createElement("div");
            const checkBox = document.createElement("input");
            checkBox.type = "checkbox";
            checkBox.id = task.id;
            checkBox.name = "task";
            checkBox.value = task.id;
            const label = document.createElement("label");
            label.htmlFor = task.id;
            label.appendChild(document.createTextNode(task.name));
            div.appendChild(checkBox);
            div.appendChild(label);
            fragment.appendChild(div);
        });
        container.appendChild(fragment);
    });
}

fetchData();

deleteForm.addEventListener("submit", deleteTasks);
addForm.addEventListener("submit", addTask);
document.addEventListener("DOMContentLoaded", () => {
    const startDateInput = document.getElementById("start-date");
    const endDateInput = document.getElementById("end-date");

    const today = new Date().toISOString().slice(0,10);
    const tomorrow = new Date(new Date().getTime()+ 24 * 60 * 60 * 1000).toISOString().slice(0,10);

    startDateInput.value = today;
    endDateInput.value = tomorrow;
});