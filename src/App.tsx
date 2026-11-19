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
import { DatabaseBackupPayload } from './components/ImportDatabaseModal';

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

    // Subscribe to multi-device real-time sync
    const unsubscribe = storage.subscribeSync((updatedDb) => {
      if (updatedDb.users) setAllUsers(updatedDb.users);
      if (updatedDb.raks) setAllRaks(updatedDb.raks);
      if (updatedDb.materials) setAllMaterials(updatedDb.materials);
      if (updatedDb.lines) setAllLines(updatedDb.lines);
      if (updatedDb.tasks) setTasks(updatedDb.tasks);
      if (updatedDb.task_items) setTaskItems(updatedDb.task_items);
      if (updatedDb.logs) setLogs(updatedDb.logs);
    });

    // Initial server fetch
    storage.syncFromServer();

    // High-frequency polling (1.5s) to sync tasks/scans across all devices and IPs
    const syncInterval = setInterval(() => {
      storage.checkAndSync();
    }, 1500);

    const handleFocusSync = () => {
      storage.checkAndSync();
    };
    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
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

  // Keep currentActiveTask synchronized with server updates
  useEffect(() => {
    if (!currentActiveTask) return;
    const latest = tasks.find((t) => t.id === currentActiveTask.id);
    if (latest && (latest.status !== currentActiveTask.status || latest.end_time !== currentActiveTask.end_time)) {
      setCurrentActiveTask(latest);
    }
  }, [tasks, currentActiveTask]);

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
            storage.saveTasksLocalOnly(updatedTasks);
            storage.mutate({ action: 'CREATE_TASK', payload: { task: newTask } });
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

      // Existing registered User -> Update login and redirect atomically
      const updatedUser: User = {
        ...existingUser,
        last_login_at: new Date().toISOString(),
      };
      const updatedUsers = allUsers.map((u) => (u.id === existingUser.id ? updatedUser : u));
      storage.saveUsersLocalOnly(updatedUsers);
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

      const logEntry = storage.createLogLocal({
        task_id: userActiveTask?.id || 'NO_TASK',
        operator_id: existingUser.id,
        operator_name: existingUser.nama,
        event_type: 'LOGIN',
        notes: `Operator terdaftar login: ${existingUser.nama} (${existingUser.employee_id})`,
      });
      setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

      storage.mutateBatch([
        { action: 'UPSERT_USER', payload: { user: updatedUser } },
        { action: 'APPEND_LOG', payload: { log: logEntry } },
      ]);

      if (userActiveTask) {
        navigateToView('operator-task-input');
      } else {
        navigateToView('operator-history');
      }

      sound.playSuccessBeep();
      return { success: true };
    } else {
      // AUTO-CREATE OPERATOR BARU: Memudahkan operator baru langsung bisa memakai sistem secara atomik
      const nowMs = Date.now();
      const newUserId = `u-${nowMs}-${Math.random().toString(36).slice(2, 6)}`;
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

      const newTaskId = `task-${nowMs}-${Math.random().toString(36).slice(2, 6)}`;
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

      storage.saveUsersLocalOnly(updatedUsers);
      storage.saveTasksLocalOnly(updatedTasks);
      storage.setCurrentUser(newUser);
      storage.setActiveTaskId(newTaskId);

      setAllUsers(updatedUsers);
      setTasks(updatedTasks);
      setCurrentUser(newUser);
      setCurrentActiveTask(newTask);

      const logEntry = storage.createLogLocal({
        task_id: newTaskId,
        operator_id: newUserId,
        operator_name: newUser.nama,
        event_type: 'AUTO_REGISTER',
        notes: `POKA-YOKE FAST-TRACK: Operator baru otomatis didaftarkan: ${newUser.nama} (${newUser.employee_id}). Task awal ${newTask.task_no} dibuat.`,
      });
      setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

      storage.mutateBatch([
        { action: 'UPSERT_USER', payload: { user: newUser } },
        { action: 'CREATE_TASK', payload: { task: newTask } },
        { action: 'APPEND_LOG', payload: { log: logEntry } },
      ]);

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
    storage.saveUsersLocalOnly(updatedUsers);
    storage.setCurrentUser(updatedUser);
    setAllUsers(updatedUsers);
    setCurrentUser(updatedUser);

    const logEntry = storage.createLogLocal({
      task_id: 'SYSTEM',
      operator_id: user.id,
      operator_name: user.nama,
      event_type: 'LOGIN',
      notes: `Staff login: ${user.nama} (${user.role.toUpperCase()})`,
    });
    setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

    storage.mutateBatch([
      { action: 'UPSERT_USER', payload: { user: updatedUser } },
      { action: 'APPEND_LOG', payload: { log: logEntry } },
    ]);

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

  // Operator creates new task (atomic per-record)
  const handleCreateNewTask = () => {
    if (!currentUser) return;
    const newTaskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

    setTasks((prev) => {
      const next = [newTask, ...prev];
      storage.saveTasksLocalOnly(next);
      return next;
    });
    storage.setActiveTaskId(newTaskId);
    setCurrentActiveTask(newTask);

    const logEntry = storage.createLogLocal({
      task_id: newTaskId,
      operator_id: currentUser.id,
      operator_name: currentUser.nama,
      event_type: 'TASK_CREATE',
      notes: `Task baru dibuat oleh operator: ${newTask.task_no} (Shift ${newTask.shift})`,
    });
    setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

    storage.mutateBatch([
      { action: 'CREATE_TASK', payload: { task: newTask } },
      { action: 'APPEND_LOG', payload: { log: logEntry } },
    ]);

    navigateToView('operator-task-input');
  };

  // Operator adds item to trolley (atomic per-record so concurrent operators never overwrite each other)
  const handleAddTaskItem = (itemData: Omit<TaskItem, 'id'>) => {
    const newItem: TaskItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };

    setTaskItems((prev) => {
      const next = [...prev, newItem];
      storage.saveTaskItemsLocalOnly(next);
      return next;
    });

    const mat = allMaterials.find((m) => m.id === newItem.material_id);
    const rak = allRaks.find((r) => r.id === newItem.rak_id);

    const logEntry = storage.createLogLocal({
      task_id: newItem.task_id,
      task_item_id: newItem.id,
      operator_id: newItem.user_id,
      operator_name: currentUser?.nama || 'Operator',
      event_type: 'MATERIAL_PICKED',
      notes: `Scan material: ${mat?.kode_material} (${newItem.qty} ${newItem.satuan}) dari rak ${rak?.kode_rak}`,
      location_ref: rak?.kode_rak,
    });
    setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

    storage.mutateBatch([
      { action: 'ADD_TASK_ITEM', payload: { item: newItem } },
      { action: 'APPEND_LOG', payload: { log: logEntry } },
    ]);
  };

  // Operator removes item from trolley (atomic per-record)
  const handleRemoveTaskItem = (itemId: string) => {
    setTaskItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      storage.saveTaskItemsLocalOnly(next);
      return next;
    });
    storage.mutate({ action: 'REMOVE_TASK_ITEM', payload: { itemId } });
  };

  // Operator confirms departure (T1) atomically for current task
  const handleConfirmDeparture = (mode: DepartureMode) => {
    if (!currentActiveTask) return;
    const targetTaskId = currentActiveTask.id;
    const now = new Date().toISOString();

    setTaskItems((prev) => {
      const next = prev.map((item) => {
        if (item.task_id === targetTaskId && item.status === 'PICKED') {
          return {
            ...item,
            status: 'IN_TRANSIT' as const,
            picked_at: now,
            departure_mode: mode,
          };
        }
        return item;
      });
      storage.saveTaskItemsLocalOnly(next);
      return next;
    });

    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id === targetTaskId) {
          return {
            ...t,
            status: 'active' as const,
            start_time: t.start_time || now,
          };
        }
        return t;
      });
      storage.saveTasksLocalOnly(next);
      return next;
    });

    const logEntry = storage.createLogLocal({
      task_id: targetTaskId,
      operator_id: currentUser?.id || '',
      operator_name: currentUser?.nama || 'Operator',
      event_type: 'DEPARTURE_MANUAL',
      departure_mode: mode,
      notes: `Keberangkatan dikonfirmasi [${mode}]. Status barang diubah ke IN_TRANSIT (T1: ${new Date(
        now
      ).toLocaleTimeString('id-ID')}).`,
    });
    setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

    storage.mutateBatch([
      {
        action: 'CONFIRM_TASK_DEPARTURE',
        payload: { taskId: targetTaskId, pickedAt: now, mode },
      },
      { action: 'APPEND_LOG', payload: { log: logEntry } },
    ]);
  };

  // COMPLETION SCAN VERIFICATION WITH POKA-YOKE AUTO-DEPARTURE FALLBACK (Atomic per-item update)
  const handleVerifyDestinationScan = (scannedQr: string) => {
    if (!currentActiveTask) {
      return { success: false, matchedCount: 0, errorMessage: 'Tidak ada task aktif.' };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    let matchedCount = 0;
    let targetLineName = '';
    let hasFallback = false;
    let leadTimeSec = 0;
    const itemUpdates: Array<{ id: string; patch: Partial<TaskItem> }> = [];

    taskItems.forEach((item) => {
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
            pickedTimeStr = item.last_material_scanned_at || nowIso;
            depMode = 'AUTO_FALLBACK';
            hasFallback = true;
          } else if (depMode === 'AUTO_FALLBACK') {
            hasFallback = true;
          }

          const pickedTimeDate = new Date(pickedTimeStr);
          const diffSeconds = Math.max(
            1,
            Math.round((now.getTime() - pickedTimeDate.getTime()) / 1000)
          );
          leadTimeSec = diffSeconds;
          matchedCount++;

          itemUpdates.push({
            id: item.id,
            patch: {
              status: 'DELIVERED',
              picked_at: pickedTimeStr,
              delivered_at: nowIso,
              departure_mode: depMode,
              delivery_duration_sec: diffSeconds,
            },
          });
        }
      }
    });

    if (matchedCount > 0) {
      const patchMap = new Map(itemUpdates.map((u) => [u.id, u.patch]));
      setTaskItems((prev) => {
        const next = prev.map((item) => {
          const patch = patchMap.get(item.id);
          return patch ? { ...item, ...patch } : item;
        });
        storage.saveTaskItemsLocalOnly(next);
        return next;
      });

      const determinedDepMode: DepartureMode = hasFallback ? 'AUTO_FALLBACK' : 'MANUAL_PRESS';

      const logEntry = storage.createLogLocal({
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
      setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

      storage.mutateBatch([
        { action: 'UPDATE_TASK_ITEMS', payload: { updates: itemUpdates } },
        { action: 'APPEND_LOG', payload: { log: logEntry } },
      ]);

      return {
        success: true,
        matchedCount,
        targetLineName,
        depMode: determinedDepMode,
        leadTimeSec,
      };
    } else {
      // Rejection log
      const logEntry = storage.createLogLocal({
        task_id: currentActiveTask.id,
        operator_id: currentUser?.id || '',
        operator_name: currentUser?.nama || 'Operator',
        event_type: 'DELIVERY_MISMATCH_REJECTED',
        location_ref: scannedQr,
        notes: `LOKASI SALAH! Scan QR ${scannedQr} tidak cocok dengan target line material di troli ini.`,
      });
      setLogs((prev) => [logEntry, ...prev].slice(0, 1000));
      storage.mutate({ action: 'APPEND_LOG', payload: { log: logEntry } });

      return {
        success: false,
        matchedCount: 0,
        errorMessage: `LOKASI SALAH! QR Code "${scannedQr}" tidak sesuai dengan target pengiriman item aktif di troli Anda.`,
      };
    }
  };

  // Return to Rack (T3) atomically per item
  const handleReturnToRack = () => {
    if (!currentActiveTask) return;
    const now = new Date();
    const nowIso = now.toISOString();
    const itemUpdates: Array<{ id: string; patch: Partial<TaskItem> }> = [];

    taskItems.forEach((item) => {
      if (
        item.task_id === currentActiveTask.id &&
        item.status === 'DELIVERED' &&
        !item.return_at
      ) {
        const deliveredDate = item.delivered_at ? new Date(item.delivered_at) : now;
        const returnSec = Math.max(1, Math.round((now.getTime() - deliveredDate.getTime()) / 1000));
        itemUpdates.push({
          id: item.id,
          patch: {
            return_at: nowIso,
            return_duration_sec: returnSec,
          },
        });
      }
    });

    if (itemUpdates.length > 0) {
      const patchMap = new Map(itemUpdates.map((u) => [u.id, u.patch]));
      setTaskItems((prev) => {
        const next = prev.map((item) => {
          const patch = patchMap.get(item.id);
          return patch ? { ...item, ...patch } : item;
        });
        storage.saveTaskItemsLocalOnly(next);
        return next;
      });
    }

    const logEntry = storage.createLogLocal({
      task_id: currentActiveTask.id,
      operator_id: currentUser?.id || '',
      operator_name: currentUser?.nama || 'Operator',
      event_type: 'RETURN_TO_RACK',
      notes: `Operator kembali ke area rak gudang (T3 recorded). Siklus selesai.`,
    });
    setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

    storage.mutateBatch([
      ...(itemUpdates.length > 0
        ? [{ action: 'UPDATE_TASK_ITEMS' as const, payload: { updates: itemUpdates } }]
        : []),
      { action: 'APPEND_LOG', payload: { log: logEntry } },
    ]);
  };

  // Complete task atomically
  const handleCompleteTask = () => {
    if (!currentActiveTask) return;
    const targetTaskId = currentActiveTask.id;
    const targetTaskNo = currentActiveTask.task_no;
    const nowIso = new Date().toISOString();

    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id === targetTaskId) {
          return {
            ...t,
            status: 'completed' as const,
            end_time: nowIso,
          };
        }
        return t;
      });
      storage.saveTasksLocalOnly(next);
      return next;
    });

    storage.setActiveTaskId(null);
    setCurrentActiveTask(null);

    const logEntry = storage.createLogLocal({
      task_id: targetTaskId,
      operator_id: currentUser?.id || '',
      operator_name: currentUser?.nama || 'Operator',
      event_type: 'TASK_COMPLETED',
      notes: `Task ${targetTaskNo} dinyatakan SELESAI (COMPLETED).`,
    });
    setLogs((prev) => [logEntry, ...prev].slice(0, 1000));

    storage.mutateBatch([
      {
        action: 'UPDATE_TASK',
        payload: { taskId: targetTaskId, patch: { status: 'completed', end_time: nowIso } },
      },
      { action: 'APPEND_LOG', payload: { log: logEntry } },
    ]);

    sound.playDeliveryConfirmedChime();
    navigateToView('operator-history');
  };

  // Restore / Import Database from JSON Backup (single atomic server snapshot)
  const handleRestoreDatabase = (
    backup: DatabaseBackupPayload,
    mode: 'overwrite' | 'merge'
  ) => {
    recordActivity();

    let finalRaks = allRaks;
    let finalMaterials = allMaterials;
    let finalLines = allLines;
    let finalUsers = allUsers;
    let finalTasks = tasks;
    let finalItems = taskItems;
    let finalLogs = logs;

    // 1. RAKS
    if (backup.raks && Array.isArray(backup.raks)) {
      if (mode === 'overwrite') {
        finalRaks = backup.raks;
      } else {
        const existingIds = new Set(allRaks.map((r) => r.id));
        const updated = allRaks.map((r) => backup.raks!.find((b) => b.id === r.id) || r);
        const added = backup.raks.filter((b) => !existingIds.has(b.id));
        finalRaks = [...updated, ...added];
      }
      setAllRaks(finalRaks);
    }

    // 2. MATERIALS
    if (backup.materials && Array.isArray(backup.materials)) {
      if (mode === 'overwrite') {
        finalMaterials = backup.materials;
      } else {
        const existingIds = new Set(allMaterials.map((m) => m.id));
        const updated = allMaterials.map((m) => backup.materials!.find((b) => b.id === m.id) || m);
        const added = backup.materials.filter((b) => !existingIds.has(b.id));
        finalMaterials = [...updated, ...added];
      }
      setAllMaterials(finalMaterials);
    }

    // 3. LINES
    if (backup.lines && Array.isArray(backup.lines)) {
      if (mode === 'overwrite') {
        finalLines = backup.lines;
      } else {
        const existingIds = new Set(allLines.map((l) => l.id));
        const updated = allLines.map((l) => backup.lines!.find((b) => b.id === l.id) || l);
        const added = backup.lines.filter((b) => !existingIds.has(b.id));
        finalLines = [...updated, ...added];
      }
      setAllLines(finalLines);
    }

    // 4. USERS
    if (backup.users && Array.isArray(backup.users)) {
      if (mode === 'overwrite') {
        finalUsers = backup.users;
      } else {
        const existingIds = new Set(allUsers.map((u) => u.id));
        const updated = allUsers.map((u) => backup.users!.find((b) => b.id === u.id) || u);
        const added = backup.users.filter((b) => !existingIds.has(b.id));
        finalUsers = [...updated, ...added];
      }
      setAllUsers(finalUsers);
      storage.saveUsersLocalOnly(finalUsers);
    }

    // 5. TASKS
    if (backup.tasks && Array.isArray(backup.tasks)) {
      if (mode === 'overwrite') {
        finalTasks = backup.tasks;
      } else {
        const existingIds = new Set(tasks.map((t) => t.id));
        const updated = tasks.map((t) => backup.tasks!.find((b) => b.id === t.id) || t);
        const added = backup.tasks.filter((b) => !existingIds.has(b.id));
        finalTasks = [...updated, ...added];
      }
      setTasks(finalTasks);
      storage.saveTasksLocalOnly(finalTasks);
    }

    // 6. TASK ITEMS
    if (backup.taskItems && Array.isArray(backup.taskItems)) {
      if (mode === 'overwrite') {
        finalItems = backup.taskItems;
      } else {
        const existingIds = new Set(taskItems.map((i) => i.id));
        const updated = taskItems.map((i) => backup.taskItems!.find((b) => b.id === i.id) || i);
        const added = backup.taskItems.filter((b) => !existingIds.has(b.id));
        finalItems = [...updated, ...added];
      }
      setTaskItems(finalItems);
      storage.saveTaskItemsLocalOnly(finalItems);
    }

    // 7. LOGS
    if (backup.logs && Array.isArray(backup.logs)) {
      if (mode === 'overwrite') {
        finalLogs = backup.logs;
      } else {
        const existingIds = new Set(logs.map((l) => l.id));
        const added = backup.logs.filter((b) => !existingIds.has(b.id));
        finalLogs = [...logs, ...added];
      }
      setLogs(finalLogs);
    }

    const restoreLog: SpatiotemporalLogEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      task_id: 'SYSTEM',
      operator_id: currentUser?.id || 'admin',
      operator_name: currentUser?.nama || 'Administrator',
      event_type: 'DATABASE_RESTORE',
      notes: `Database berhasil di-restore dari file JSON backup (Mode: ${mode.toUpperCase()}) pada ${new Date().toLocaleString('id-ID')}.`,
    };
    const nextLogs = [restoreLog, ...finalLogs].slice(0, 1000);
    setLogs(nextLogs);

    storage.saveFullDatabase({
      raks: finalRaks,
      materials: finalMaterials,
      lines: finalLines,
      users: finalUsers,
      tasks: finalTasks,
      task_items: finalItems,
      logs: nextLogs,
    });

    sound.playSuccessBeep();
    alert(`Database berhasil dipulihkan (${mode === 'overwrite' ? 'Restore Penuh / Overwrite' : 'Merge / Penggabungan Data'})!`);
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
            allUsers={allUsers}
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
              allRaks={allRaks}
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
              tasks={tasks}
              taskItems={taskItems}
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
              onRestoreDatabase={handleRestoreDatabase}
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
