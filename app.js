// Task Manager Class
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.taskForm = document.getElementById('taskForm');
        this.tasksList = document.getElementById('tasksList');
        this.courseFilter = document.getElementById('courseFilter');
        this.priorityFilter = document.getElementById('priorityFilter');
        this.statusFilter = document.getElementById('statusFilter');
        this.attachments = new Map(); // Store file attachments in memory
        
        this.totalTasksElement = document.getElementById('totalTasks');
        this.completedTasksElement = document.getElementById('completedTasks');
        this.pendingTasksElement = document.getElementById('pendingTasks');
        
        this.init();
        this.initializeCharts();
        this.updateStatistics(); // Ensure statistics are updated on initialization
        this.updateCourseList(); // Initialize course datalist
    }

    init() {

        this.taskForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.courseFilter.addEventListener('input', () => this.renderTasks());
        this.priorityFilter.addEventListener('change', () => this.renderTasks());
        this.statusFilter.addEventListener('change', () => this.renderTasks());
        
        // Initialize file handling
        document.getElementById('taskAttachment').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });

        // Initialize modal
        const modal = document.getElementById('calendarModal');
        const closeBtn = document.getElementsByClassName('close')[0];
        
        closeBtn.onclick = () => modal.style.display = "none";
        window.onclick = (e) => {
            if (e.target == modal) {
                modal.style.display = "none";
            }
        }
        
        this.renderTasks();
    }

    updateCourseList() {
        // Get course names from tasks
        const courses = [...new Set(this.tasks.map(task => task.course))];
        
        // update lists
        const courseList = document.getElementById('courseList');
        courseList.innerHTML = courses
            .map(course => `<option value="${course}">`)
            .join('');
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const taskTitle = document.getElementById('taskTitle').value;
        const taskCourse = document.getElementById('taskCourse').value.trim();
        const taskDueDate = document.getElementById('taskDueDate').value;
        const taskTime = document.getElementById('taskTime').value;
        const taskDescription = document.getElementById('taskDescription').value;
        const taskPriority = document.getElementById('taskPriority').value;
        const taskAttachment = document.getElementById('taskAttachment').files[0];
        
        if (this.taskForm.dataset.editing) {
            // edit existing task
            const taskId = parseInt(this.taskForm.dataset.editing);
            this.editTask(taskId, taskTitle, taskCourse, taskDueDate, taskTime, taskDescription, taskPriority, taskAttachment);
            delete this.taskForm.dataset.editing;
            document.querySelector('.btn-submit').textContent = 'Add Task';
        } else {
            // adds new task
            this.addTask(taskTitle, taskCourse, taskDueDate, taskTime, taskDescription, taskPriority, taskAttachment);
        }
        
        this.taskForm.reset();
        this.renderTasks();
        this.updateStatistics();
        this.updateCharts();
        this.updateCourseList();
    }

    handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.attachments.set(file.name, {
                name: file.name,
                type: file.type,
                data: e.target.result
            });
        };
        reader.readAsDataURL(file);
    }

    addTask(title, course, dueDate, time, description, priority, attachment) {
        const task = {
            id: Date.now(),
            title,
            course,
            dueDate,
            time,
            description,
            priority,
            attachment: attachment ? attachment.name : null,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.updateStatistics();
    }

    editTask(taskId, title, course, dueDate, time, description, priority, attachment) {
        this.tasks = this.tasks.map(task => {
            if (task.id === taskId) {
                return {
                    ...task,
                    title,
                    course,
                    dueDate,
                    time,
                    description,
                    priority,
                    attachment: attachment ? attachment.name : task.attachment
                };
            }
            return task;
        });
        
        this.saveTasks();
    }

    deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.attachment) {
            this.attachments.delete(task.attachment);
        }
        
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderTasks();
        this.updateStatistics(); 
        this.updateCharts();
    }

    toggleTaskComplete(taskId) {
        this.tasks = this.tasks.map(task => {
            if (task.id === taskId) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        
        this.saveTasks();
        this.renderTasks();
        this.updateStatistics();
        this.updateCharts();
    }

    populateForm(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskCourse').value = task.course;
        document.getElementById('taskDueDate').value = task.dueDate;
        document.getElementById('taskTime').value = task.time || '';
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskPriority').value = task.priority;
        
        this.taskForm.dataset.editing = taskId;
        document.querySelector('.btn-submit').textContent = 'Update Task';
    }

    updateStatistics() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;

        if (this.totalTasksElement) {
            this.totalTasksElement.textContent = total;
        }
        if (this.completedTasksElement) {
            this.completedTasksElement.textContent = completed;
        }
        if (this.pendingTasksElement) {
            this.pendingTasksElement.textContent = pending;
        }

        console.log('Statistics Updated:', { total, completed, pending });
    }

    initializeCharts() {
        const ctx = document.getElementById('taskStats').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['High', 'Medium', 'Low'],
                datasets: [{
                    label: 'Tasks by Priority',
                    data: [0, 0, 0],
                    backgroundColor: ['#e74c3c', '#f39c12', '#27ae60']
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        stepSize: 1
                    }
                }
            }
        });
        
        this.updateCharts();
    }

    updateCharts() {
        const priorityCounts = {
            high: this.tasks.filter(task => task.priority === 'high').length,
            medium: this.tasks.filter(task => task.priority === 'medium').length,
            low: this.tasks.filter(task => task.priority === 'low').length
        };

        this.chart.data.datasets[0].data = [
            priorityCounts.high,
            priorityCounts.medium,
            priorityCounts.low
        ];
        this.chart.update();
    }

    renderTasks() {
        const courseFilterValue = this.courseFilter.value.toLowerCase().trim();
        const selectedPriority = this.priorityFilter.value;
        const selectedStatus = this.statusFilter.value;
        
        let filteredTasks = this.tasks;
        
        if (courseFilterValue) {
            filteredTasks = filteredTasks.filter(task => 
                task.course.toLowerCase().includes(courseFilterValue)
            );
        }
        
        if (selectedPriority !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === selectedPriority);
        }
        
        if (selectedStatus !== 'all') {
            filteredTasks = filteredTasks.filter(task => 
                selectedStatus === 'completed' ? task.completed : !task.completed
            );
        }
        
        filteredTasks.sort((a, b) => {
            const dateComparison = new Date(a.dueDate) - new Date(b.dueDate);
            if (dateComparison === 0) {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return dateComparison;
        });
        
        this.tasksList.innerHTML = filteredTasks.map(task => this.createTaskElement(task)).join('');
        
        this.addTaskEventListeners();
    }

    createTaskElement(task) {
        const priorityClass = task.priority ? `priority-${task.priority}` : '';
        const completedClass = task.completed ? 'completed' : '';
        
        return `
            <div class="task-item ${priorityClass} ${completedClass}" data-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} class="task-checkbox">
                        ${task.title}
                    </div>
                    <div class="task-meta">
                        <div class="task-course">${task.course}</div>
                        <div class="task-priority">${task.priority.toUpperCase()}</div>
                    </div>
                </div>
                <div class="task-date">Due: ${new Date(task.dueDate).toLocaleDateString()} ${task.time || ''}</div>
                <div class="task-description">${task.description}</div>
                ${task.attachment ? `
                    <div class="task-attachment">
                        <i class="fas fa-paperclip"></i>
                        <a href="#" onclick="downloadAttachment('${task.attachment}'); return false;">
                            ${task.attachment}
                        </a>
                    </div>
                ` : ''}
                <div class="task-actions">
                    <button class="btn-edit">Edit</button>
                    <button class="btn-delete">Delete</button>
                </div>
            </div>
        `;
    }

    addTaskEventListeners() {
        // edit buttons
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.closest('.task-item').dataset.id);
                this.populateForm(taskId);
            });
        });

        // delete buttons
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.closest('.task-item').dataset.id);
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteTask(taskId);
                }
            });
        });

        // llisteners for checkboxes
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = parseInt(e.target.closest('.task-item').dataset.id);
                this.toggleTaskComplete(taskId);
            });
        });
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }
}

// Initialize the Task Manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TaskManager();
});

// Global0function for downloading the attached files etc..
window.downloadAttachment = function(fileName) {
    const attachment = taskManager.attachments.get(fileName);
    if (attachment) {
        const link = document.createElement('a');
        link.href = attachment.data;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}; 
