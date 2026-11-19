<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dbPath = __DIR__ . '/../data/db.json';

// Ensure data folder and file exists
function getDbData($path) {
    if (!file_exists($path)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'db.json not found']);
        exit;
    }
    $raw = file_get_contents($path);
    return json_decode($raw, true);
}

function saveDbData($path, $data) {
    $data['last_updated'] = round(microtime(true) * 1000);
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    return $data['last_updated'];
}

function applySingleOperation(&$db, $action, $payload) {
    foreach (['users', 'raks', 'materials', 'lines', 'tasks', 'task_items', 'logs'] as $k) {
        if (!isset($db[$k]) || !is_array($db[$k])) $db[$k] = [];
    }

    switch ($action) {
        case 'UPSERT_USER':
            $user = $payload['user'] ?? null;
            if (!$user || empty($user['id'])) break;
            $foundIdx = -1;
            foreach ($db['users'] as $idx => $u) {
                if ($u['id'] === $user['id'] || (!empty($u['employee_id']) && !empty($user['employee_id']) && strcasecmp($u['employee_id'], $user['employee_id']) === 0)) {
                    $foundIdx = $idx;
                    break;
                }
            }
            if ($foundIdx >= 0) {
                $existingId = $db['users'][$foundIdx]['id'];
                $db['users'][$foundIdx] = array_merge($db['users'][$foundIdx], $user);
                $db['users'][$foundIdx]['id'] = $existingId;
            } else {
                $db['users'][] = $user;
            }
            break;

        case 'CREATE_TASK':
            $task = $payload['task'] ?? null;
            if (!$task || empty($task['id'])) break;
            $exists = false;
            foreach ($db['tasks'] as $t) {
                if ($t['id'] === $task['id']) { $exists = true; break; }
            }
            if (!$exists) array_unshift($db['tasks'], $task);
            break;

        case 'UPDATE_TASK':
            $taskId = $payload['taskId'] ?? '';
            $patch = $payload['patch'] ?? null;
            if (!$taskId || !is_array($patch)) break;
            foreach ($db['tasks'] as $idx => $t) {
                if ($t['id'] === $taskId) {
                    $db['tasks'][$idx] = array_merge($t, $patch);
                }
            }
            break;

        case 'ADD_TASK_ITEM':
            $item = $payload['item'] ?? null;
            if (!$item || empty($item['id'])) break;
            $exists = false;
            foreach ($db['task_items'] as $i) {
                if ($i['id'] === $item['id']) { $exists = true; break; }
            }
            if (!$exists) $db['task_items'][] = $item;
            break;

        case 'REMOVE_TASK_ITEM':
            $itemId = $payload['itemId'] ?? '';
            if (!$itemId) break;
            $db['task_items'] = array_values(array_filter($db['task_items'], function($i) use ($itemId) {
                return ($i['id'] ?? '') !== $itemId;
            }));
            break;

        case 'CONFIRM_TASK_DEPARTURE':
            $taskId = $payload['taskId'] ?? '';
            $pickedAt = $payload['pickedAt'] ?? '';
            $mode = $payload['mode'] ?? 'MANUAL_PRESS';
            if (!$taskId || !$pickedAt) break;
            foreach ($db['task_items'] as $idx => $item) {
                if (($item['task_id'] ?? '') === $taskId && ($item['status'] ?? '') === 'PICKED') {
                    $db['task_items'][$idx]['status'] = 'IN_TRANSIT';
                    $db['task_items'][$idx]['picked_at'] = $pickedAt;
                    $db['task_items'][$idx]['departure_mode'] = $mode;
                }
            }
            foreach ($db['tasks'] as $idx => $t) {
                if (($t['id'] ?? '') === $taskId) {
                    $db['tasks'][$idx]['status'] = 'active';
                    if (empty($db['tasks'][$idx]['start_time'])) {
                        $db['tasks'][$idx]['start_time'] = $pickedAt;
                    }
                }
            }
            break;

        case 'UPDATE_TASK_ITEMS':
            $updates = $payload['updates'] ?? [];
            if (!is_array($updates)) break;
            $patchMap = [];
            foreach ($updates as $u) {
                if (!empty($u['id']) && is_array($u['patch'] ?? null)) {
                    $patchMap[$u['id']] = $u['patch'];
                }
            }
            foreach ($db['task_items'] as $idx => $item) {
                $id = $item['id'] ?? '';
                if (isset($patchMap[$id])) {
                    $db['task_items'][$idx] = array_merge($item, $patchMap[$id]);
                }
            }
            break;

        case 'APPEND_LOG':
            $log = $payload['log'] ?? null;
            if (!$log || empty($log['id'])) break;
            $exists = false;
            foreach ($db['logs'] as $l) {
                if ($l['id'] === $log['id']) { $exists = true; break; }
            }
            if (!$exists) {
                array_unshift($db['logs'], $log);
                if (count($db['logs']) > 1000) {
                    $db['logs'] = array_slice($db['logs'], 0, 1000);
                }
            }
            break;
    }
}

$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$action = $_GET['action'] ?? '';

// Determine route
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $db = getDbData($dbPath);
    if ($action === 'last-updated' || strpos($requestUri, 'last-updated') !== false) {
        echo json_encode(['success' => true, 'last_updated' => $db['last_updated'] ?? 0]);
        exit;
    }
    echo json_encode(['success' => true, 'data' => $db, 'last_updated' => $db['last_updated'] ?? 0]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $lockFp = fopen($dbPath . '.lock', 'c');
    if ($lockFp) flock($lockFp, LOCK_EX);

    $db = getDbData($dbPath);

    if ($action === 'mutate' || strpos($requestUri, '/mutate') !== false) {
        if (isset($input['operations']) && is_array($input['operations'])) {
            foreach ($input['operations'] as $op) {
                if (!empty($op['action'])) {
                    applySingleOperation($db, $op['action'], $op['payload'] ?? []);
                }
            }
        } elseif (!empty($input['action'])) {
            applySingleOperation($db, $input['action'], $input['payload'] ?? []);
        }
        $lastUpdated = saveDbData($dbPath, $db);
        if ($lockFp) { flock($lockFp, LOCK_UN); fclose($lockFp); }
        echo json_encode(['success' => true, 'data' => $db, 'last_updated' => $lastUpdated]);
        exit;
    }

    if ($action === 'save-entity' || (isset($input['entity']) && isset($input['data']))) {
        $entity = $input['entity'] ?? '';
        $data = $input['data'] ?? null;
        if ($entity && $data !== null) {
            $db[$entity] = $data;
            $lastUpdated = saveDbData($dbPath, $db);
            if ($lockFp) { flock($lockFp, LOCK_UN); fclose($lockFp); }
            echo json_encode(['success' => true, 'entity' => $entity, 'last_updated' => $lastUpdated]);
            exit;
        }
    }

    if ($input) {
        foreach (['users', 'raks', 'materials', 'lines', 'tasks', 'task_items', 'logs'] as $key) {
            if (isset($input[$key])) {
                $db[$key] = $input[$key];
            }
        }
        $lastUpdated = saveDbData($dbPath, $db);
        if ($lockFp) { flock($lockFp, LOCK_UN); fclose($lockFp); }
        echo json_encode(['success' => true, 'data' => $db, 'last_updated' => $lastUpdated]);
        exit;
    }

    if ($lockFp) { flock($lockFp, LOCK_UN); fclose($lockFp); }
    echo json_encode(['success' => false, 'message' => 'No valid data provided']);
    exit;
}

