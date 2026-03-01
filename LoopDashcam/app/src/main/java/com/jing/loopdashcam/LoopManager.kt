package com.jing.loopdashcam

import android.content.Context
import android.os.Environment
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * Manages video file storage and implements FIFO loop recording logic.
 */
class LoopManager(private val context: Context) {
    private val appDir: File by lazy {
        val dir = File(context.getExternalFilesDir(Environment.DIRECTORY_MOVIES), "LoopDashcam")
        if (!dir.exists()) dir.mkdirs()
        dir
    }

    private val maxStorageLimit = 5L * 1024 * 1024 * 1024 // 5 GB limit for now

    fun createNewFile(): File {
        checkAndCleanupSpace()
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        return File(appDir, "VID_$timestamp.mp4")
    }

    private fun checkAndCleanupSpace() {
        val files = appDir.listFiles()?.toMutableList() ?: return
        var currentSize = files.sumBy { it.length().toInt() }.toLong()

        if (currentSize >= maxStorageLimit) {
            files.sortBy { it.lastModified() }
            while (currentSize >= maxStorageLimit && files.isNotEmpty()) {
                val oldestFile = files.removeAt(0)
                currentSize -= oldestFile.length()
                oldestFile.delete()
            }
        }
    }

    fun getStorageInfo(): String {
        val totalSpace = appDir.totalSpace
        val freeSpace = appDir.freeSpace
        val usedSpace = (totalSpace - freeSpace) / (1024 * 1024 * 1024)
        return "Used: $usedSpace GB | Limit: ${maxStorageLimit / (1024 * 1024 * 1024)} GB"
    }
}
