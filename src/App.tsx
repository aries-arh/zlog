import React, { useState, useEffect } from 'react';
import {
  User,
  MasterRak,
  MasterMaterial,
  MasterLine,
  Task,
  TaskItem,
  SpatiotemporalLogEvent,
  DepartureMode,
  UserRole,
} from './types';
import {
  storage,
  getCurrentShift,
  generateTaskNo,
} from './utils/storage';
import { sound } from './utils/audio';
import { Header } from './components/Header';
import { AccessDenied } from './components/AccessDenied';
import { LoginView } from './views/LoginView';
import { OperatorTaskInputView } from './views/OperatorTaskInputView';
import { OperatorHistoryView } from './views/OperatorHistoryView';
import { SpvMonitoringView } from './views/SpvMonitoringView';
import { ManagerKpiView } from './views/ManagerKpiView';
import { AdminMasterView } from './views/AdminMasterView';

export const App: React.FC = () => {
  // Global persistent state from storage
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRaks, setAllRaks] = useState<MasterRak[]>([]);
  const [allMaterials, setAllMaterials] = useState<MasterMaterial[]>([]);
  const [allLines, setAllLines] = useState<MasterLine[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskItems, setTaskItems] = useState<TaskItem[]>([]);
  const [logs, setLogs] = useState<SpatiotemporalLogEvent[]>([]);

  // Navigation state
  // views: 'login' | 'operator-task-input' | 'operator-history' | 'spv' | 'manager' | 'admin'
  const [currentView, setCurrentView] = useState<string>('login');
  const [currentActiveTask, setCurrentActiveTask] = useState<Task | null>(null);

  // Load data on startup
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    const loadedUsers = storage.getUsers();
    const loadedRaks = storage.getRaks();
    const loadedMaterials = storage.getMaterials();
    const loadedLines = storage.getLines();
    const loadedTasks = storage.getTasks();
    const loadedItems = storage.getTaskItems();
    const loadedLogs = storage.getLogs();
    const savedUser = storage.getCurrentUser();
    const savedTaskId = storage.getActiveTaskId();

    setAllUsers(loadedUsers);
    setAllRaks(loadedRaks);
    setAllMaterials(loadedMaterials);
    setAllLines(loadedLines);
    setTasks(loadedTasks);
    setTaskItems(loadedItems);
    setLogs(loadedLogs);

    if (savedUser) {
      setCurrentUser(savedUser);
      // Route to correct view
      if (savedUser.role === 'admin') setCurrentView('admin');
      else if (savedUser.role === 'spv') setCurrentView('spv');
      else if (savedUser.role === 'manager') setCurrentView('manager');
      else {
        // Operator
        if (savedTaskId) {
          const taskObj = loadedTasks.find((t) => t.id === savedTaskId);
          if (taskObj && (taskObj.status === 'active' || taskObj.status === 'new')) {
            setCurrentActiveTask(taskObj);
            setCurrentView('operator-task-input');
            return;
          }
        }
        setCurrentView('operator-history');
      }
    } else {
      setCurrentView('login');
    }
  };

  // 1. FAST-TRACK OPERATOR LOGIN & AUTO-CREATE (Section 9.1)
  const handleOperatorLogin = (employeeIdOrQr: string) => {
    const cleanId = employeeIdOrQr.trim();
    const existingUser = allUsers.find(
      (u) =>
        u.employee_id.toUpperCase() === cleanId.toUpperCase() ||
        (u.qr_code && u.qr_code.toUpperCase() === cleanId.toUpperCase())
    );

    if (existingUser) {
      // Existing User -> Update login and redirect to Operator History
      const updatedUser: User = {
        ...existingUser,
        last_login_at: new Date().toISOString(),
      };
      const updatedUsers = allUsers.map((u) => (u.id === existingUser.id ? updatedUser : u));
      storage.saveUsers(updatedUsers);
      storage.setCurrentUser(updatedUser);
      setAllUsers(updatedUsers);
      setCurrentUser(updatedUser);

      // Check if user has active task
      const userActiveTask = tasks.find(
        (t) => t.user_id === existingUser.id && (t.status === 'active' || t.status === 'new')
      );
      if (userActiveTask) {
        setCurrentActiveTask(userActiveTask);
        storage.setActiveTaskId(userActiveTask.id);
      } else {
        setCurrentActiveTask(null);
        storage.setActiveTaskId(null);
      }

      storage.addLog({
        task_id: userActiveTask?.id || 'NO_TASK',
        operator_id: existingUser.id,
        operator_name: existingUser.nama,
        event_type: 'LOGIN',
        notes: `Operator terdaftar login: ${existingUser.nama} (${existingUser.employee_id})`,
      });
      setLogs(storage.getLogs());

      // Existing user routes to Dashboard History
      setCurrentView('operator-history');
    } else {
      // NEW USER: Auto-create account & Auto-create initial task -> Direct to Panel Input Task!
      const newUserId = `u-${Date.now()}`;
      const newUser: User = {
        id: newUserId,
        employee_id: cleanId.toUpperCase(),
        nama: `Operator ${cleanId.toUpperCase()}`,
        qr_code: cleanId.toUpperCase(),
        role: 'operator',
        status: 'active',
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      };

      const newTaskId = `task-${Date.now()}`;
      const newTask: Task = {
        id: newTaskId,
        user_id: newUserId,
        task_no: generateTaskNo(),
        tanggal: new Date().toISOString().split('T')[0],
        shift: getCurrentShift(),
        status: 'new',
        start_time: new Date().toISOString(),
        end_time: null,
      };

      const updatedUsers = [...allUsers, newUser];
      const updatedTasks = [newTask, ...tasks];

      storage.saveUsers(updatedUsers);
      storage.saveTasks(updatedTasks);
      storage.setCurrentUser(newUser);
      storage.setActiveTaskId(newTaskId);

      setAllUsers(updatedUsers);
      setTasks(updatedTasks);
      setCurrentUser(newUser);
      setCurrentActiveTask(newTask);

      storage.addLog({
        task_id: newTaskId,
        operator_id: newUserId,
        operator_name: newUser.nama,
        event_type: 'AUTO_REGISTER',
        notes: `POKA-YOKE FAST-TRACK: User baru otomatis didaftarkan: ${newUser.nama}. Task awal ${newTask.task_no} dibuat.`,
      });
      setLogs(storage.getLogs());

      // Direct routing to Panel Input Task!
      setCurrentView('operator-task-input');
    }
  };

  // 2. STAFF LOGIN (Admin / SPV / Manager)
  const handleStaffLogin = (username: string, pass: string): boolean => {
    const user = allUsers.find(
      (u) => u.employee_id.toLowerCase() === username.toLowerCase()
    );
    if (!user) return false;

    // Check basic role match or password
    if (user.role === 'operator') return false;

    storage.setCurrentUser(user);
    setCurrentUser(user);

    storage.addLog({
      task_id: 'SYSTEM',
      operator_id: user.id,
      operator_name: user.nama,
      event_type: 'LOGIN',
      notes: `Staff login: ${user.nama} (${user.role.toUpperCase()})`,
    });
    setLogs(storage.getLogs());

    if (user.role === 'admin') setCurrentView('admin');
    else if (user.role === 'spv') setCurrentView('spv');
    else if (user.role === 'manager') setCurrentView('manager');

    return true;
  };

  const handleLogout = () => {
    storage.setCurrentUser(null);
    storage.setActiveTaskId(null);
    setCurrentUser(null);
    setCurrentActiveTask(null);
    setCurrentView('login');
  };

  const handleResetData = () => {
    storage.resetAllData();
    loadAllData();
  };

  // Operator creates new task
  const handleCreateNewTask = () => {
    if (!currentUser) return;
    const newTaskId = `task-${Date.now()}`;
    const newTask: Task = {
      id: newTaskId,
      user_id: currentUser.id,
      task_no: generateTaskNo(),
      tanggal: new Date().toISOString().split('T')[0],
      shift: getCurrentShift(),
      status: 'new',
      start_time: new Date().toISOString(),
      end_time: null,
    };

    const updatedTasks = [newTask, ...tasks];
    storage.saveTasks(updatedTasks);
    storage.setActiveTaskId(newTaskId);
    setTasks(updatedTasks);
    setCurrentActiveTask(newTask);

    storage.addLog({
      task_id: newTaskId,
      operator_id: currentUser.id,
      operator_name: currentUser.nama,
      event_type: 'TASK_CREATE',
      notes: `Task baru dibuat oleh operator: ${newTask.task_no} (Shift ${newTask.shift})`,
    });
    setLogs(storage.getLogs());

    setCurrentView('operator-task-input');
  };

  // Operator adds item to trolley
  const handleAddTaskItem = (itemData: Omit<TaskItem, 'id'>) => {
    const newItem: TaskItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    const updatedItems = [...taskItems, newItem];
    storage.saveTaskItems(updatedItems);
    setTaskItems(updatedItems);

    const mat = allMaterials.find((m) => m.id === newItem.material_id);
    const rak = allRaks.find((r) => r.id === newItem.rak_id);

    storage.addLog({
      task_id: newItem.task_id,
      task_item_id: newItem.id,
      operator_id: newItem.user_id,
      operator_name: currentUser?.nama || 'Operator',
      event_type: 'MATERIAL_PICKED',
      notes: `Scan material: ${mat?.kode_material} (${newItem.qty} ${newItem.satuan}) dari rak ${rak?.kode_rak}`,
      location_ref: rak?.kode_rak,
    });
    setLogs(storage.getLogs());
  };

  // Operator removes item from trolley
  const handleRemoveTaskItem = (itemId: string) => {
    const updatedItems = taskItems.filter((i) => i.id !== itemId);
    storage.saveTaskItems(updatedItems);
    setTaskItems(updatedItems);
  };

  // Operator confirms departure (T1)
  const handleConfirmDeparture = (mode: DepartureMode) => {
    if (!currentActiveTask) return;
    const now = new Date().toISOString();

    const updatedItems = taskItems.map((item) => {
      if (item.task_id === currentActiveTask.id && item.status === 'PICKED') {
        return {
          ...item,
          status: 'IN_TRANSIT' as const,
          picked_at: now,
          departure_mode: mode,
        };
      }
      return item;
    });

    const updatedTasks = tasks.map((t) => {
      if (t.id === currentActiveTask.id) {
        return {
          ...t,
          status: 'active' as const,
          start_time: t.start_time || now,
        };
      }
      return t;
    });

    storage.saveTaskItems(updatedItems);
    storage.saveTasks(updatedTasks);
    setTaskItems(updatedItems);
    setTasks(updatedTasks);

    storage.addLog({
      task_id: currentActiveTask.id,
      operator_id: currentUser?.id || '',
      operator_name: currentUser?.nama || 'Operator',
      event_type: 'DEPARTURE_MANUAL',
      departure_mode: mode,
      notes: `Keberangkatan dikonfirmasi [${mode}]. Status barang diubah ke IN_TRANSIT (T1: ${new Date(
        now
      ).toLocaleTimeString('id-ID')}).`,
    });
    setLogs(storage.getLogs());
  };

  // COMPLETION SCAN VERIFICATION WITH POKA-YOKE AUTO-DEPARTURE FALLBACK (Section 5.2 & Section 9.2)
  const handleVerifyDestinationScan = (scannedQr: string) => {
    if (!currentActiveTask) {
      return { success: false, matchedCount: 0, errorMessage: 'Tidak ada task aktif.' };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Find all items in this task that are either PICKED or IN_TRANSIT
    const activeItems = taskItems.filter(
      (item) =>
        item.task_id === currentActiveTask.id &&
        (item.status === 'PICKED' || item.status === 'IN_TRANSIT')
    );

    let matchedCount = 0;
    let targetLineName = '';
    let finalDepMode: DepartureMode = 'MANUAL_PRESS';
    let leadTimeSec = 0;

    const updatedItems = taskItems.map((item) => {
      if (
        item.task_id === currentActiveTask.id &&
        (item.status === 'PICKED' || item.status === 'IN_TRANSIT')
      ) {
        const targetLine = allLines.find((l) => l.id === item.line_id);
        if (targetLine && targetLine.qr_code_proses.toUpperCase() === scannedQr.trim().toUpperCase()) {
          targetLineName = targetLine.nama_line;

          // POKA-YOKE: Handle jika operator lupa tekan "Berangkat" (picked_at / T1 is null)
          let pickedTimeStr = item.picked_at;
          let depMode: DepartureMode = item.departure_mode;

          if (!pickedTimeStr) {
            // Jalur Fallback: otomatis ambil timestamp scan material terakhir
            pickedTimeStr = item.last_material_scanned_at || nowIso;
            depMode = 'AUTO_FALLBACK';
          }
          finalDepMode = depMode;

          const pickedTimeDate = new Date(pickedTimeStr);
          const diffSeconds = Math.max(
            1,
            Math.round((now.getTime() - pickedTimeDate.getTime()) / 1000)
          );
          leadTimeSec = diffSeconds;

          matchedCount++;

          return {
            ...item,
            status: 'DELIVERED' as const,
            picked_at: pickedTimeStr,
            delivered_at: nowIso,
            departure_mode: depMode,
            delivery_duration_sec: diffSeconds,
          };
        }
      }
      return item;
    });

    if (matchedCount > 0) {
      storage.saveTaskItems(updatedItems);
      setTaskItems(updatedItems);

      const isFallback = updatedItems.some(
        (i) => i.departure_mode === 'AUTO_FALLBACK' && i.delivered_at === nowIso
      );
      const determinedDepMode: DepartureMode = isFallback ? 'AUTO_FALLBACK' : 'MANUAL_PRESS';

      storage.addLog({
        task_id: currentActiveTask.id,
        operator_id: currentUser?.id || '',
        operator_name: currentUser?.nama || 'Operator',
        event_type:
          determinedDepMode === 'AUTO_FALLBACK'
            ? 'DEPARTURE_AUTO_FALLBACK'
            : 'DELIVERED_CONFIRMED',
        departure_mode: determinedDepMode,
        location_ref: scannedQr,
        notes: `Penyerahan sukses di ${targetLineName} (${matchedCount} item). Lead Time: ${leadTimeSec}s. Mode: [${determinedDepMode}].`,
      });
      setLogs(storage.getLogs());

      return {
        success: true,
        matchedCount,
        targetLineName,
        depMode: determinedDepMode,
        leadTimeSec,
      };
    } else {
      // Rejection log
      storage.addLog({
        task_id: currentActiveTask.id,
        operator_id: currentUser?.id || '',
        operator_name: currentUser?.nama || 'Operator',
        event_type: 'DELIVERY_MISMATCH_REJECTED',
        location_ref: scannedQr,
        notes: `LOKASI SALAH! Scan QR ${scannedQr} tidak cocok dengan target line material di troli ini.`,
      });
      setLogs(storage.getLogs());

      return {
        success: false,
        matchedCount: 0,
        errorMessage: `LOKASI SALAH! QR Code "${scannedQr}" tidak sesuai dengan target pengiriman item aktif di troli Anda.`,
      };
    }
  };

  // Return to Rack (T3)
  const handleReturnToRack = () => {
    if (!currentActiveTask) return;
    const now = new Date();
    const nowIso = now.toISOString();

    const updatedItems = taskItems.map((item) => {
      if (
        item.task_id === currentActiveTask.id &&
        item.status === 'DELIVERED' &&
        !item.return_at
      ) {
        const deliveredDate = item.delivered_at ? new Date(item.delivered_at) : now;
        const returnSec = Math.max(1, Math.round((now.getTime() - deliveredDate.getTime()) / 1000));
        return {
          ...item,
          return_at: nowIso,
          return_duration_sec: returnSec,
        };
      }
      return item;
    });

    storage.saveTaskItems(updatedItems);
    setTaskItems(updatedItems);

    storage.addLog({
      task_id: currentActiveTask.id,
      operator_id: currentUser?.id || '',
      operator_name: currentUser?.nama || 'Operator',
      event_type: 'RETURN_TO_RACK',
      notes: `Operator kembali ke area rak gudang (T3 recorded). Siklus selesai.`,
    });
    setLogs(storage.getLogs());
  };

  // Complete task
  const handleCompleteTask = () => {
    if (!currentActiveTask) return;
    const nowIso = new Date().toISOString();

    const updatedTasks = tasks.map((t) => {
      if (t.id === currentActiveTask.id) {
        return {
          ...t,
          status: 'completed' as const,
          end_time: nowIso,
        };
      }
      return t;
    });

    storage.saveTasks(updatedTasks);
    storage.setActiveTaskId(null);
    setTasks(updatedTasks);
    setCurrentActiveTask(null);

    storage.addLog({
      task_id: currentActiveTask.id,
      operator_id: currentUser?.id || '',
      operator_name: currentUser?.nama || 'Operator',
      event_type: 'TASK_COMPLETED',
      notes: `Task ${currentActiveTask.task_no} dinyatakan SELESAI (COMPLETED).`,
    });
    setLogs(storage.getLogs());

    sound.playDeliveryConfirmedChime();
    setCurrentView('operator-history');
  };

  // Strict RBAC Access Validator
  const isViewAllowed = (role: UserRole | undefined, view: string): boolean => {
    if (!role) return view === 'login';
    // Admin has Super-Admin Omnipresent Access to all views
    if (role === 'admin') return true;
    // Operator is restricted ONLY to operator input and history
    if (role === 'operator') return view === 'operator-task-input' || view === 'operator-history';
    // SPV is restricted ONLY to SPV Live Monitoring
    if (role === 'spv') return view === 'spv';
    // Manager is restricted ONLY to Manager KPI
    if (role === 'manager') return view === 'manager';
    return false;
  };

  const getDefaultViewForRole = (role: UserRole | undefined): string => {
    if (role === 'admin') return 'admin';
    if (role === 'spv') return 'spv';
    if (role === 'manager') return 'manager';
    return 'operator-history';
  };

  const handleNavigate = (view: string) => {
    if (!currentUser) {
      setCurrentView('login');
      return;
    }

    if (!isViewAllowed(currentUser.role, view)) {
      sound.playErrorBeep();
      alert(
        `AKSES DITOLAK (RBAC)! Akun dengan role [${currentUser.role.toUpperCase()}] tidak memiliki izin untuk membuka menu ini.`
      );
      return;
    }

    if (view === 'operator-task-input') {
      if (!currentActiveTask) {
        // Find existing active or new task
        const active = tasks.find((t) => t.status === 'active' || t.status === 'new');
        if (active) {
          setCurrentActiveTask(active);
          storage.setActiveTaskId(active.id);
          setCurrentView('operator-task-input');
        } else {
          handleCreateNewTask();
        }
      } else {
        setCurrentView('operator-task-input');
      }
    } else {
      setCurrentView(view);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans">
      <Header
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onResetData={handleResetData}
        hasActiveTask={Boolean(
          currentActiveTask &&
            (currentActiveTask.status === 'active' || currentActiveTask.status === 'new')
        )}
      />

      {/* Main Container with RBAC Route Guards */}
      <main className="flex-1">
        {currentView === 'login' && (
          <LoginView
            onOperatorLogin={handleOperatorLogin}
            onStaffLogin={handleStaffLogin}
          />
        )}

        {/* Operator Panel Input View */}
        {currentView === 'operator-task-input' && (
          isViewAllowed(currentUser?.role, 'operator-task-input') ? (
            currentUser && currentActiveTask ? (
              <OperatorTaskInputView
                user={
                  currentUser.role === 'admin'
                    ? allUsers.find((u) => u.id === currentActiveTask.user_id) || currentUser
                    : currentUser
                }
                task={currentActiveTask}
                allRaks={allRaks}
                allMaterials={allMaterials}
                allLines={allLines}
                taskItems={taskItems}
                onAddTaskItem={handleAddTaskItem}
                onRemoveTaskItem={handleRemoveTaskItem}
                onConfirmDeparture={handleConfirmDeparture}
                onVerifyDestinationScan={handleVerifyDestinationScan}
                onReturnToRack={handleReturnToRack}
                onCompleteTask={handleCompleteTask}
                onBackToHistory={() => setCurrentView('operator-history')}
              />
            ) : null
          ) : (
            <AccessDenied
              currentRole={currentUser?.role}
              requiredRole="Operator Gemba"
              onBackToAllowed={() => setCurrentView(getDefaultViewForRole(currentUser?.role))}
            />
          )
        )}

        {/* Operator History View */}
        {currentView === 'operator-history' && (
          isViewAllowed(currentUser?.role, 'operator-history') ? (
            currentUser ? (
              <OperatorHistoryView
                user={currentUser}
                tasks={tasks}
                taskItems={taskItems}
                allRaks={allRaks}
                allMaterials={allMaterials}
                allLines={allLines}
                allUsers={allUsers}
                onOpenTask={(task) => {
                  setCurrentActiveTask(task);
                  storage.setActiveTaskId(task.id);
                  setCurrentView('operator-task-input');
                }}
                onCreateNewTask={handleCreateNewTask}
              />
            ) : null
          ) : (
            <AccessDenied
              currentRole={currentUser?.role}
              requiredRole="Operator Gemba"
              onBackToAllowed={() => setCurrentView(getDefaultViewForRole(currentUser?.role))}
            />
          )
        )}

        {/* Supervisor View */}
        {currentView === 'spv' && (
          isViewAllowed(currentUser?.role, 'spv') ? (
            <SpvMonitoringView
              tasks={tasks}
              taskItems={taskItems}
              allUsers={allUsers}
              allRaks={allRaks}
              allMaterials={allMaterials}
              allLines={allLines}
              logs={logs}
            />
          ) : (
            <AccessDenied
              currentRole={currentUser?.role}
              requiredRole="Supervisor (SPV)"
              onBackToAllowed={() => setCurrentView(getDefaultViewForRole(currentUser?.role))}
            />
          )
        )}

        {/* Manager View */}
        {currentView === 'manager' && (
          isViewAllowed(currentUser?.role, 'manager') ? (
            <ManagerKpiView
              tasks={tasks}
              taskItems={taskItems}
              allUsers={allUsers}
              allLines={allLines}
              allMaterials={allMaterials}
            />
          ) : (
            <AccessDenied
              currentRole={currentUser?.role}
              requiredRole="Logistics Manager"
              onBackToAllowed={() => setCurrentView(getDefaultViewForRole(currentUser?.role))}
            />
          )
        )}

        {/* Admin Master View */}
        {currentView === 'admin' && (
          isViewAllowed(currentUser?.role, 'admin') ? (
            <AdminMasterView
              raks={allRaks}
              materials={allMaterials}
              lines={allLines}
              users={allUsers}
              logs={logs}
              onSaveRaks={(newRaks) => {
                setAllRaks(newRaks);
                storage.saveRaks(newRaks);
              }}
              onSaveMaterials={(newMats) => {
                setAllMaterials(newMats);
                storage.saveMaterials(newMats);
              }}
              onSaveLines={(newLines) => {
                setAllLines(newLines);
                storage.saveLines(newLines);
              }}
              onSaveUsers={(newUsers) => {
                setAllUsers(newUsers);
                storage.saveUsers(newUsers);
              }}
            />
          ) : (
            <AccessDenied
              currentRole={currentUser?.role}
              requiredRole="Administrator Sistem"
              onBackToAllowed={() => setCurrentView(getDefaultViewForRole(currentUser?.role))}
            />
          )
        )}
      </main>

      {/* Footer info bar */}
      <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center text-xs text-slate-500 font-mono print:hidden">
        ZEVA Logistik Material v1.6 • Lean Manufacturing &amp; Gemba UX • Poka-Yoke Auto-Departure Fallback
      </footer>
    </div>
  );
};
