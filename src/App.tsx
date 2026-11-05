import React, { useState, useEffect, useCallback } from 'react';
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

// 5 Menit Idle Timeout: Sesi reset ke login jika tidak ada pergerakan > 5 menit
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

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

  // User activity tracker
  const recordActivity = useCallback(() => {
    storage.setLastActivityTime(Date.now());
  }, []);

  const navigateToView = useCallback((view: string) => {
    setCurrentView(view);
    storage.setCurrentView(view);
    storage.setLastActivityTime(Date.now());
  }, []);

  // Load data on startup with 5-minute idle session restore check
  useEffect(() => {
    loadAllData();
  }, []);

  // Listen to user interaction events (clicks, touch, typing, mouse movement) to keep session fresh
  useEffect(() => {
    let lastThrottledTime = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 3000) {
        lastThrottledTime = now;
        recordActivity();
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
    };
  }, [recordActivity]);

  // Check periodically (every 10 seconds) if session has been idle for > 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentUser) return;
      const lastActivity = storage.getLastActivityTime();
      if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        sound.playErrorBeep();
        alert('Sesi Anda telah berakhir karena tidak ada pergerakan/aktivitas lebih dari 5 menit.');
        handleLogout();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const loadAllData = () => {
    const loadedUsers = storage.getUsers();
    const loadedRaks = storage.getRaks();
    const loadedMaterials = storage.getMaterials();
    const loadedLines = storage.getLines();
    const loadedTasks = storage.getTasks();
    const loadedItems = storage.getTaskItems();
    const loadedLogs = storage.getLogs();

    setAllUsers(loadedUsers);
    setAllRaks(loadedRaks);
    setAllMaterials(loadedMaterials);
    setAllLines(loadedLines);
    setTasks(loadedTasks);
    setTaskItems(loadedItems);
    setLogs(loadedLogs);

    const savedUser = storage.getCurrentUser();
    const savedTaskId = storage.getActiveTaskId();
    const savedView = storage.getCurrentView();
    const lastActivity = storage.getLastActivityTime();
    const now = Date.now();

    // Check if session has expired due to 5 minutes of inactivity
    const isExpired = !lastActivity || now - lastActivity > INACTIVITY_TIMEOUT_MS;

    if (savedUser && !isExpired) {
      // Validate that user still exists and is active in database
      const userInDb = loadedUsers.find((u) => u.id === savedUser.id);
      if (userInDb && userInDb.status === 'active') {
        storage.setLastActivityTime(now);
        setCurrentUser(userInDb);

        // Restore active task if exists
        let activeTask: Task | null = null;
        if (savedTaskId) {
          activeTask = loadedTasks.find((t) => t.id === savedTaskId) || null;
        }
        if (!activeTask) {
          activeTask =
            loadedTasks.find(
              (t) =>
                (userInDb.role === 'admin' || t.user_id === userInDb.id) &&
                (t.status === 'active' || t.status === 'new')
            ) || null;
        }

        if (activeTask) {
          setCurrentActiveTask(activeTask);
          storage.setActiveTaskId(activeTask.id);
        } else {
          setCurrentActiveTask(null);
          storage.setActiveTaskId(null);
        }

        // Restore view: If the user was on 'operator-task-input', restore directly to that menu!
        const targetView = savedView || getDefaultViewForRole(userInDb.role);
        if (isViewAllowed(userInDb.role, targetView)) {
          if (targetView === 'operator-task-input' && !activeTask) {
            // If operator was on input view but had no active task, find existing or create new task
            const newTaskId = `task-${Date.now()}`;
            const newTask: Task = {
              id: newTaskId,
              user_id: userInDb.id,
              task_no: generateTaskNo(),
              tanggal: new Date().toISOString().split('T')[0],
              shift: getCurrentShift(),
              status: 'new',
              start_time: new Date().toISOString(),
              end_time: null,
            };
            const updatedTasks = [newTask, ...loadedTasks];
            storage.saveTasks(updatedTasks);
            storage.setActiveTaskId(newTaskId);
            setTasks(updatedTasks);
            setCurrentActiveTask(newTask);
            setCurrentView('operator-task-input');
            storage.setCurrentView('operator-task-input');
          } else {
            setCurrentView(targetView);
            storage.setCurrentView(targetView);
          }
        } else {
          const defaultView = getDefaultViewForRole(userInDb.role);
          setCurrentView(defaultView);
          storage.setCurrentView(defaultView);
        }
        return;
      }
    }

    // If no user saved or idle > 5 minutes, clear session and show login screen
    storage.clearSession();
    setCurrentUser(null);
    setCurrentActiveTask(null);
    setCurrentView('login');
  };

  // 1. OPERATOR LOGIN & AUTHENTICATION (With Fast-Track Auto-Create)
  const handleOperatorLogin = (employeeIdOrQr: string): { success: boolean; message?: string } => {
    const cleanId = employeeIdOrQr.trim();
    if (!cleanId) {
      return { success: false, message: 'Harap masukkan ID Karyawan atau scan QR Code.' };
    }
    if (cleanId.length < 3) {
      return { success: false, message: 'ID Karyawan / NIK minimal 3 karakter.' };
    }

    const existingUser = allUsers.find(
      (u) =>
        u.employee_id.toUpperCase() === cleanId.toUpperCase() ||
        (u.qr_code && u.qr_code.toUpperCase() === cleanId.toUpperCase())
    );

    if (existingUser) {
      if (existingUser.status !== 'active') {
        sound.playErrorBeep();
        return {
          success: false,
          message: `Akun Operator [${existingUser.employee_id} - ${existingUser.nama}] berstatus NONAKTIF. Hubungi Administrator untuk aktivasi.`,
        };
      }

      // Existing registered User -> Update login and redirect
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

      if (userActiveTask) {
        navigateToView('operator-task-input');
      } else {
        navigateToView('operator-history');
      }

      sound.playSuccessBeep();
      return { success: true };
    } else {
      // AUTO-CREATE OPERATOR BARU: Memudahkan operator baru langsung bisa memakai sistem
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
        notes: `POKA-YOKE FAST-TRACK: Operator baru otomatis didaftarkan: ${newUser.nama} (${newUser.employee_id}). Task awal ${newTask.task_no} dibuat.`,
      });
      setLogs(storage.getLogs());

      sound.playSuccessBeep();
      // Direct masuk ke Panel Input Task agar operator baru langsung bekerja!
      navigateToView('operator-task-input');
      return { success: true };
    }
  };

  // 2. STAFF LOGIN (Admin / SPV / Manager)
  const handleStaffLogin = (username: string, pass: string): { success: boolean; message?: string } => {
    const cleanUser = username.trim();
    const cleanPass = pass.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Harap isi username dan password!' };
    }

    const user = allUsers.find(
      (u) => u.employee_id.toLowerCase() === cleanUser.toLowerCase()
    );
    if (!user) {
      return { success: false, message: 'Username atau password tidak valid!' };
    }

    if (user.role === 'operator') {
      return { success: false, message: 'Akun operator tidak memiliki akses ke portal staf manajemen.' };
    }

    if (user.status !== 'active') {
      return { success: false, message: `Akun [${user.employee_id}] sedang NONAKTIF. Hubungi Administrator.` };
    }

    const expectedPass = user.password || `${user.employee_id}123`;
    if (cleanPass !== expectedPass) {
      return { success: false, message: 'Username atau password tidak valid!' };
    }

    const updatedUser: User = {
      ...user,
      last_login_at: new Date().toISOString(),
    };
    const updatedUsers = allUsers.map((u) => (u.id === user.id ? updatedUser : u));
    storage.saveUsers(updatedUsers);
    storage.setCurrentUser(updatedUser);
    setAllUsers(updatedUsers);
    setCurrentUser(updatedUser);

    storage.addLog({
      task_id: 'SYSTEM',
      operator_id: user.id,
      operator_name: user.nama,
      event_type: 'LOGIN',
      notes: `Staff login: ${user.nama} (${user.role.toUpperCase()})`,
    });
    setLogs(storage.getLogs());

    if (user.role === 'admin') navigateToView('admin');
    else if (user.role === 'spv') navigateToView('spv');
    else if (user.role === 'manager') navigateToView('manager');

    return { success: true };
  };

  const handleLogout = () => {
    storage.clearSession();
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

    navigateToView('operator-task-input');
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
    navigateToView('operator-history');
  };

  const handleNavigate = (view: string) => {
    recordActivity();
    if (!currentUser) {
      navigateToView('login');
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
        const active = tasks.find(
          (t) =>
            (currentUser.role === 'admin' || t.user_id === currentUser.id) &&
            (t.status === 'active' || t.status === 'new')
        );
        if (active) {
          setCurrentActiveTask(active);
          storage.setActiveTaskId(active.id);
          navigateToView('operator-task-input');
        } else {
          handleCreateNewTask();
        }
      } else {
        navigateToView('operator-task-input');
      }
    } else {
      navigateToView(view);
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
                onBackToHistory={() => navigateToView('operator-history')}
              />
            ) : null
          ) : (
            <AccessDenied
              currentRole={currentUser?.role}
              requiredRole="Operator Gemba"
              onBackToAllowed={() => navigateToView(getDefaultViewForRole(currentUser?.role))}
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
                  navigateToView('operator-task-input');
                }}
                onCreateNewTask={handleCreateNewTask}
              />
            ) : null
          ) : (
            <AccessDenied
              currentRole={currentUser?.role}
              requiredRole="Operator Gemba"
              onBackToAllowed={() => navigateToView(getDefaultViewForRole(currentUser?.role))}
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
              onBackToAllowed={() => navigateToView(getDefaultViewForRole(currentUser?.role))}
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
              onBackToAllowed={() => navigateToView(getDefaultViewForRole(currentUser?.role))}
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
              currentUser={currentUser}
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
              onBackToAllowed={() => navigateToView(getDefaultViewForRole(currentUser?.role))}
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
