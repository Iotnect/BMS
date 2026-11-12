<?php

$_SERVER['VIEW_COMPILED_PATH'] ??= sys_get_temp_dir().'/bms-views';
$_SERVER['LOG_CHANNEL'] ??= 'stderr';
$_SERVER['SESSION_SECURE_COOKIE'] ??= 'true';

define('BMS_VERCEL', true);

require dirname(__DIR__).'/public/index.php';
