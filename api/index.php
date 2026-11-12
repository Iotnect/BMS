<?php

$database = sys_get_temp_dir().'/meridian-bms.sqlite';

if (! is_file($database)) {
    $temporaryCopy = tempnam(dirname($database), 'bms-');

    if ($temporaryCopy === false) {
        throw new RuntimeException('Could not allocate a temporary SQLite database.');
    }

    try {
        if (! copy(dirname(__DIR__).'/database/vercel-demo.sqlite', $temporaryCopy)) {
            throw new RuntimeException('Could not copy the seeded SQLite database.');
        }

        if (! @link($temporaryCopy, $database) && ! is_file($database)) {
            throw new RuntimeException('Could not initialize the SQLite database.');
        }
    } finally {
        unlink($temporaryCopy);
    }
}

$_SERVER['DB_CONNECTION'] = 'sqlite';
$_SERVER['DB_DATABASE'] = $database;
$_SERVER['DB_URL'] = '';
$_SERVER['VIEW_COMPILED_PATH'] ??= sys_get_temp_dir().'/bms-views';
$_SERVER['LOG_CHANNEL'] ??= 'stderr';
$_SERVER['SESSION_SECURE_COOKIE'] ??= 'true';

define('BMS_VERCEL', true);

require dirname(__DIR__).'/public/index.php';
