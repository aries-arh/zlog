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
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    return $data['last_updated'];
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
    $db = getDbData($dbPath);

    if ($action === 'save-entity' || (isset($input['entity']) && isset($input['data']))) {
        $entity = $input['entity'] ?? '';
        $data = $input['data'] ?? null;
        if ($entity && $data !== null) {
            $db[$entity] = $data;
            $lastUpdated = saveDbData($dbPath, $db);
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
        echo json_encode(['success' => true, 'last_updated' => $lastUpdated]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'No valid data provided']);
    exit;
}

