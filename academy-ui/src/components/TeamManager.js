import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

const TeamManager = ({ projectId }) => {
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchProjectData();
  }, [projectId, currentUser]);

  const fetchProjectData = async () => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const projectData = { id: projectSnap.id, ...projectSnap.data() };
        setProject(projectData);
        setMembers(projectData.members || []);
        setApplications(projectData.applications || []);
        setIsProjectOwner(projectData.createdBy === currentUser?.uid);
      }
    } catch (err) {
      setError('Proje verileri yüklenirken hata oluştu: ' + err.message);
    }
  };

  const handleAcceptApplication = async (application) => {
    if (!isProjectOwner) return;

    setLoading(true);
    setError('');

    try {
      // Başvuruyu kabul et ve üye olarak ekle
      const newMember = {
        userId: application.userId,
        userEmail: application.userEmail,
        joinedAt: new Date(),
        role: 'member'
      };

      // Başvuruyu güncelle
      const updatedApplication = { ...application, status: 'accepted' };

      // Eski başvuruyu kaldır ve yenisini ekle
      await updateDoc(doc(db, 'projects', projectId), {
        applications: arrayRemove(application)
      });

      await updateDoc(doc(db, 'projects', projectId), {
        applications: arrayUnion(updatedApplication),
        members: arrayUnion(newMember),
        currentMembers: (project.currentMembers || 1) + 1
      });

      // State'i güncelle
      setApplications(prev => 
        prev.map(app => 
          app.userId === application.userId ? updatedApplication : app
        )
      );
      setMembers(prev => [...prev, newMember]);
      setProject(prev => ({ ...prev, currentMembers: (prev.currentMembers || 1) + 1 }));

    } catch (err) {
      setError('Başvuru kabul edilirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectApplication = async (application) => {
    if (!isProjectOwner) return;

    setLoading(true);
    setError('');

    try {
      const updatedApplication = { ...application, status: 'rejected' };

      await updateDoc(doc(db, 'projects', projectId), {
        applications: arrayRemove(application)
      });

      await updateDoc(doc(db, 'projects', projectId), {
        applications: arrayUnion(updatedApplication)
      });

      setApplications(prev => 
        prev.map(app => 
          app.userId === application.userId ? updatedApplication : app
        )
      );

    } catch (err) {
      setError('Başvuru reddedilirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!isProjectOwner || member.userId === currentUser.uid) return;

    if (!window.confirm(`${member.userEmail} kullanıcısını projeden çıkarmak istediğinizden emin misiniz?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        members: arrayRemove(member),
        currentMembers: Math.max(1, (project.currentMembers || 1) - 1)
      });

      setMembers(prev => prev.filter(m => m.userId !== member.userId));
      setProject(prev => ({ ...prev, currentMembers: Math.max(1, (prev.currentMembers || 1) - 1) }));

    } catch (err) {
      setError('Üye çıkarılırken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveProject = async () => {
    if (isProjectOwner) {
      setError('Proje sahibi projeyi terk edemez.');
      return;
    }

    if (!window.confirm('Projeden ayrılmak istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const currentMember = members.find(m => m.userId === currentUser.uid);
      if (currentMember) {
        await updateDoc(doc(db, 'projects', projectId), {
          members: arrayRemove(currentMember),
          currentMembers: Math.max(1, (project.currentMembers || 1) - 1)
        });
      }

      // Sayfayı yenile veya yönlendir
      window.location.reload();

    } catch (err) {
      setError('Projeden ayrılırken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'owner': return 'Proje Sahibi';
      case 'admin': return 'Yönetici';
      case 'member': return 'Üye';
      default: return 'Üye';
    }
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const isMember = members.some(member => member.userId === currentUser?.uid);

  return (
    <div className="team-manager">
      {error && <div className="notification notification-error">{error}</div>}

      {/* Takım Üyeleri */}
      <div className="card">
        <div className="card-header">
          <h3>Takım Üyeleri ({(project?.currentMembers || 1)}/{project?.maxMembers})</h3>
          {isMember && !isProjectOwner && (
            <button 
              className="btn btn-danger btn-sm"
              onClick={handleLeaveProject}
              disabled={loading}
            >
              Projeden Ayrıl
            </button>
          )}
        </div>

        <div className="members-list">
          {/* Proje Sahibi */}
          <div className="member-item owner">
            <div className="member-info">
              <div className="member-avatar">
                {project?.ownerEmail?.charAt(0).toUpperCase()}
              </div>
              <div className="member-details">
                <strong>{project?.ownerEmail}</strong>
                <span className="member-role owner-role">Proje Sahibi</span>
              </div>
            </div>
            <div className="member-joined">
              Oluşturan • {project?.createdAt && new Date(project.createdAt.toDate()).toLocaleDateString('tr-TR')}
            </div>
          </div>

          {/* Diğer Üyeler */}
          {members.map((member, index) => (
            <div key={index} className="member-item">
              <div className="member-info">
                <div className="member-avatar">
                  {member.userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="member-details">
                  <strong>{member.userEmail}</strong>
                  <span className="member-role">{getRoleText(member.role)}</span>
                </div>
              </div>
              <div className="member-actions">
                <span className="member-joined">
                  Katıldı • {new Date(member.joinedAt.toDate()).toLocaleDateString('tr-TR')}
                </span>
                {isProjectOwner && member.userId !== currentUser.uid && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveMember(member)}
                    disabled={loading}
                  >
                    Çıkar
                  </button>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="empty-state">
              <p>Henüz başka üye bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bekleyen Başvurular (Sadece Proje Sahibi Görebilir) */}
      {isProjectOwner && (
        <div className="card">
          <div className="card-header">
            <h3>Bekleyen Başvurular ({pendingApplications.length})</h3>
          </div>

          {pendingApplications.length > 0 ? (
            <div className="applications-list">
              {pendingApplications.map((application, index) => (
                <div key={index} className="application-item">
                  <div className="application-info">
                    <div className="applicant-avatar">
                      {application.userEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="applicant-details">
                      <strong>{application.userEmail}</strong>
                      <small>
                        Başvuru Tarihi: {new Date(application.appliedAt.toDate()).toLocaleDateString('tr-TR')}
                      </small>
                    </div>
                  </div>
                  <div className="application-actions">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleAcceptApplication(application)}
                      disabled={loading || (project?.currentMembers >= project?.maxMembers)}
                    >
                      Kabul Et
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRejectApplication(application)}
                      disabled={loading}
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Bekleyen başvuru bulunmuyor.</p>
            </div>
          )}
        </div>
      )}

      {/* Başvuru Geçmişi (Sadece Proje Sahibi Görebilir) */}
      {isProjectOwner && applications.filter(app => app.status !== 'pending').length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Başvuru Geçmişi</h3>
          </div>

          <div className="applications-history">
            {applications
              .filter(app => app.status !== 'pending')
              .map((application, index) => (
                <div key={index} className="application-history-item">
                  <div className="application-info">
                    <div className="applicant-avatar">
                      {application.userEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="applicant-details">
                      <strong>{application.userEmail}</strong>
                      <small>
                        Başvuru: {new Date(application.appliedAt.toDate()).toLocaleDateString('tr-TR')}
                      </small>
                    </div>
                  </div>
                  <div className={`application-status ${application.status}`}>
                    {application.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Proje Kapasitesi Uyarısı */}
      {project && project.currentMembers >= project.maxMembers && (
        <div className="notification notification-warning">
          <strong>Proje Dolu:</strong> Maksimum üye kapasitesine ulaşıldı.
        </div>
      )}
    </div>
  );
};

export default TeamManager;
