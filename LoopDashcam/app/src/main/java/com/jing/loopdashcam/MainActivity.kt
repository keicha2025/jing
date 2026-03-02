package com.jing.loopdashcam

import android.Manifest
import android.content.pm.PackageManager
import android.opengl.GLSurfaceView
import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.jing.loopdashcam.camera.CameraManagerHelper
import com.jing.loopdashcam.camera.VideoEncoder
import com.jing.loopdashcam.gl.CameraGLRenderer

class MainActivity : AppCompatActivity() {

    private val PERMISSIONS_REQUEST_CODE = 100
    private val REQUIRED_PERMISSIONS = arrayOf(
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    )

    private lateinit var glSurfaceView: GLSurfaceView
    private lateinit var cameraHelper: CameraManagerHelper
    private lateinit var gpsManager: GPSManager
    private lateinit var renderer: CameraGLRenderer
    
    // Recording & Loop storage
    private lateinit var loopManager: LoopManager
    private var videoEncoder: VideoEncoder? = null
    private var isRecording = false
    
    // Quality Settings
    private var currentVidWidth = 1920
    private var currentVidHeight = 1080
    private var currentFps = 60
    private var currentBitrate = 8000000 // 8Mbps

    private var recordingStartTime = 0L
    private val timerHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val timerRunnable = object : Runnable {
        override fun run() {
            if (isRecording) {
                val elapsed = (System.currentTimeMillis() - recordingStartTime) / 1000
                val minutes = elapsed / 60
                val seconds = elapsed % 60
                findViewById<TextView>(R.id.tvRecTimer).text = String.format("%02d:%02d", minutes, seconds)
                timerHandler.postDelayed(this, 1000)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        glSurfaceView = findViewById(R.id.glSurfaceView)
        loopManager = LoopManager(this)
        
        setupUI()
        
        if (!hasPermissions()) {
            ActivityCompat.requestPermissions(
                this, REQUIRED_PERMISSIONS, PERMISSIONS_REQUEST_CODE
            )
        } else {
            initApp()
        }
    }

    private fun setupUI() {
        val btnShutter = findViewById<View>(R.id.btnShutter)
        val shutterInner = findViewById<View>(R.id.shutterInner)
        val tvRecTimer = findViewById<TextView>(R.id.tvRecTimer)
        val tvStorageInfo = findViewById<TextView>(R.id.tvStorageInfo)
        
        val btnQuality = findViewById<View>(R.id.btnQuality)
        val menuQuality = findViewById<View>(R.id.menuQuality)
        val menu4K = findViewById<View>(R.id.menu4K)
        val menu1080P = findViewById<View>(R.id.menu1080P)
        val menu720P = findViewById<View>(R.id.menu720P)

        val btnSettings = findViewById<ImageButton>(R.id.btnSettings)
        val menuSettings = findViewById<View>(R.id.menuSettings)
        val menuToggleSpeed = findViewById<TextView>(R.id.menuToggleSpeed)
        val menuSwitchCamera = findViewById<TextView>(R.id.menuSwitchCamera)

        tvStorageInfo.text = loopManager.getStorageInfo()

        btnSettings.setOnClickListener {
            if (menuSettings.visibility == View.VISIBLE) {
                menuSettings.visibility = View.GONE
            } else {
                menuSettings.visibility = View.VISIBLE
            }
        }

        menuToggleSpeed.setOnClickListener {
            renderer.showSpeed = !renderer.showSpeed
            menuSettings.visibility = View.GONE
        }

        menuSwitchCamera.setOnClickListener {
            cameraHelper.switchCamera()
            menuSettings.visibility = View.GONE
        }
        
        btnQuality.setOnClickListener {
            if (menuQuality.visibility == View.VISIBLE) {
                menuQuality.visibility = View.GONE
            } else {
                menuQuality.visibility = View.VISIBLE
            }
        }

        menu4K.setOnClickListener { changeQuality(3840, 2160, 30, 20000000, "4K") }
        menu1080P.setOnClickListener { changeQuality(1920, 1080, 60, 8000000, "1080P") }
        menu720P.setOnClickListener { changeQuality(1280, 720, 60, 4000000, "720P") }

        val dpToPx = resources.displayMetrics.density
        val sizeSmall = (24 * dpToPx).toInt()
        val sizeLarge = (56 * dpToPx).toInt()

        btnShutter.setOnClickListener {
            if (!isRecording) {
                // Ensure menu is closed before recording starts
                menuQuality.visibility = View.GONE
                menuSettings.visibility = View.GONE
                startRecording()
                shutterInner.layoutParams = shutterInner.layoutParams.apply {
                    width = sizeSmall
                    height = sizeSmall
                }
                tvRecTimer.visibility = View.VISIBLE
            } else {
                stopRecording()
                shutterInner.layoutParams = shutterInner.layoutParams.apply {
                    width = sizeLarge
                    height = sizeLarge
                }
                tvRecTimer.visibility = View.GONE
            }
            isRecording = !isRecording
        }
    }

    private fun changeQuality(width: Int, height: Int, fps: Int, bitrate: Int, resName: String) {
        if (isRecording) return // Block changes while recording

        currentVidWidth = width
        currentVidHeight = height
        currentFps = fps
        currentBitrate = bitrate

        renderer.recordingWidth = width
        renderer.recordingHeight = height

        findViewById<TextView>(R.id.tvResolution).text = resName
        findViewById<TextView>(R.id.tvFPS).text = "${fps}FPS"
        findViewById<View>(R.id.menuQuality).visibility = View.GONE

        // Real-time camera restart with new setting
        cameraHelper.changeResolution(width, height, fps)
    }

    private fun startRecording() {
        val videoFile = loopManager.createNewFile()
        videoEncoder = VideoEncoder().apply {
            prepare(videoFile, currentVidWidth, currentVidHeight, currentBitrate, currentFps)
        }

        
        recordingStartTime = System.currentTimeMillis()
        timerHandler.post(timerRunnable)
        
        // Pass the Surface from Encoder to GL Renderer for output
        val inputSurface = videoEncoder?.getInputSurface()
        glSurfaceView.queueEvent {
            renderer.recordingSurface = inputSurface
        }
    }

    private fun stopRecording() {
        timerHandler.removeCallbacks(timerRunnable)
        
        // Signal GL renderer to stop sending frames to encoder surface
        glSurfaceView.queueEvent {
            renderer.recordingSurface = null
        }
        
        // Wait a bit for the last frame to finish processing if needed
        videoEncoder?.drainEncoder(true)
        videoEncoder?.release()
        videoEncoder = null
        
        findViewById<TextView>(R.id.tvStorageInfo).text = loopManager.getStorageInfo()
    }


    private fun hasPermissions() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSIONS_REQUEST_CODE && hasPermissions()) {
            initApp()
        }
    }

    private fun initApp() {
        gpsManager = GPSManager(this) { speedKmH ->
            glSurfaceView.queueEvent {
                renderer.currentSpeed = speedKmH
            }
        }
        gpsManager.start()

        cameraHelper = CameraManagerHelper(this)

        glSurfaceView.setEGLContextClientVersion(2)
        renderer = CameraGLRenderer(this) { surfaceTexture ->
            // SurfaceTexture is ready from GL Renderer
            surfaceTexture.setOnFrameAvailableListener {
                glSurfaceView.requestRender()
            }
            // Open Camera 2 and lock to 60fps pointing to this Surface
            cameraHelper.openCamera(surfaceTexture, currentVidWidth, currentVidHeight, currentFps)
        }
        
        glSurfaceView.setRenderer(renderer)
        glSurfaceView.renderMode = GLSurfaceView.RENDERMODE_WHEN_DIRTY
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::gpsManager.isInitialized) gpsManager.stop()
        if (::cameraHelper.isInitialized) cameraHelper.closeCamera()
    }
}
