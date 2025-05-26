import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

const TaskManager = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
    status: 'todo'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchProjectData();
  }, [projectId, currentUser]);

  const fetchProjectData = async () => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        setTasks(projectData.tasks || []);
        setProjectMembers(projectData.members || []);
        setIsProjectOwner(projectData.createdBy === currentUser?.uid);
      }
    } catch (err) {
      setError('Proje verileri yüklenirken hata oluştu: ' + err.message);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      setError('Görev başlığı zorunludur.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const task = {
        id: Date.now().toString(),
        ...newTask,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'projects', projectId), {
        tasks: arrayUnion(task)
      });

      setTasks(prev => [...prev, task]);
      setNewTask({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: '',
        status: 'todo'
      });
      setShowAddTask(false);
    } catch (err) {
      setError('Görev eklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const updatedTasks = tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, updatedAt: new Date() }
          : task
      );

      // Eski görevi kaldır ve yenisini ekle
      const oldTask = tasks.find(task => task.id === taskId);
      const newTask = { ...oldTask, status: newStatus, updatedAt: new Date() };

      await updateDoc(doc(db, 'projects', projectId), {
        tasks: arrayRemove(oldTask)
      });

      await updateDoc(doc(db, 'projects', projectId), {
        tasks: arrayUnion(newTask)
      });

      setTasks(updatedTasks);
    } catch (err) {
      setError('Görev durumu güncellenirken hata oluştu: ' + err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const taskToDelete = tasks.find(task => task.id === taskId);
      
      await updateDoc(doc(db, 'projects', projectId), {
        tasks: arrayRemove(taskToDelete)
      });

      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      setError('Görev silinirken hata oluştu: ' + err.message);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'status-todo';
      case 'in_progress': return 'status-progress';
      case 'completed': return 'status-completed';
      default: return 'status-todo';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'todo': return 'Yapılacak';
      case 'in_progress': return 'Devam Ediyor';
      case 'completed': return 'Tamamlandı';
      default: return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return priority;
    }
  };

  const canManageTasks = isProjectOwner || projectMembers.some(member => member.userId === currentUser?.uid);

  return (
    <div className="task-manager">
      <div className="task-manager-header">
        <h3>Proje Görevleri</h3>
        {canManageTasks && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddTask(!showAddTask)}
          >
            {showAddTask ? 'İptal' : 'Yeni Görev Ekle'}
          </button>
        )}
      </div>

      {error && <div className="notification notification-error">{error}</div>}

      {/* Yeni Görev Ekleme Formu */}
      {showAddTask && canManageTasks && (
        <div className="card add-task-form">
          <h4>Yeni Görev Ekle</h4>
          <form onSubmit={handleAddTask}>
            <div className="form-row">
              <div className="form-group">
                <label>Görev Başlığı *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                  placeholder="Görev başlığını girin"
                />
              </div>
              
              <div className="form-group">
                <label>Öncelik</label>
                <select
                  className="form-control"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Açıklama</label>
              <textarea
                className="form-control"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                rows="3"
                placeholder="Görev açıklaması"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Atanan Kişi</label>
                <select
                  className="form-control"
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                >
                  <option value="">Atama Yapılmadı</option>
                  {projectMembers.map((member, index) => (
                    <option key={index} value={member.userEmail}>
                      {member.userEmail}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Bitiş Tarihi</label>
                <input
                  type="date"
                  className="form-control"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Ekleniyor...' : 'Görev Ekle'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowAddTask(false)}
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Görev Listesi */}
      <div className="tasks-container">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <p>Henüz görev eklenmemiş.</p>
            {canManageTasks && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowAddTask(true)}
              >
                İlk Görevi Ekle
              </button>
            )}
          </div>
        ) : (
          <div className="tasks-grid">
            {/* Yapılacaklar */}
            <div className="task-column">
              <h4 className="column-title">Yapılacaklar</h4>
              {tasks.filter(task => task.status === 'todo').map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onUpdateStatus={handleUpdateTaskStatus}
                  onDelete={handleDeleteTask}
                  canManage={canManageTasks}
                  getPriorityColor={getPriorityColor}
                  getPriorityText={getPriorityText}
                />
              ))}
            </div>

            {/* Devam Edenler */}
            <div className="task-column">
              <h4 className="column-title">Devam Ediyor</h4>
              {tasks.filter(task => task.status === 'in_progress').map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onUpdateStatus={handleUpdateTaskStatus}
                  onDelete={handleDeleteTask}
                  canManage={canManageTasks}
                  getPriorityColor={getPriorityColor}
                  getPriorityText={getPriorityText}
                />
              ))}
            </div>

            {/* Tamamlananlar */}
            <div className="task-column">
              <h4 className="column-title">Tamamlandı</h4>
              {tasks.filter(task => task.status === 'completed').map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onUpdateStatus={handleUpdateTaskStatus}
                  onDelete={handleDeleteTask}
                  canManage={canManageTasks}
                  getPriorityColor={getPriorityColor}
                  getPriorityText={getPriorityText}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskCard = ({ task, onUpdateStatus, onDelete, canManage, getPriorityColor, getPriorityText }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="task-card">
      <div className="task-header">
        <h5 className="task-title">{task.title}</h5>
        <div className={`priority-badge ${getPriorityColor(task.priority)}`}>
          {getPriorityText(task.priority)}
        </div>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        {task.assignedTo && (
          <div className="task-assigned">
            <strong>Atanan:</strong> {task.assignedTo}
          </div>
        )}
        {task.dueDate && (
          <div className="task-due-date">
            <strong>Bitiş:</strong> {new Date(task.dueDate).toLocaleDateString('tr-TR')}
          </div>
        )}
      </div>

      {canManage && (
        <div className="task-actions">
          <select
            className="form-control form-control-sm"
            value={task.status}
            onChange={(e) => onUpdateStatus(task.id, e.target.value)}
          >
            <option value="todo">Yapılacak</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="completed">Tamamlandı</option>
          </select>
          
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onDelete(task.id)}
            title="Görevi Sil"
          >
            🗑️
          </button>
        </div>
      )}

      <div className="task-footer">
        <small className="task-created">
          Oluşturan: {task.createdBy} • {new Date(task.createdAt.toDate()).toLocaleDateString('tr-TR')}
        </small>
      </div>
    </div>
  );
};

export default TaskManager;
