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
        val btnToggleSpeed = findViewById<ImageButton>(R.id.btnToggleSpeed)
        val tvStorageInfo = findViewById<TextView>(R.id.tvStorageInfo)
        val btnSwitchCamera = findViewById<ImageButton>(R.id.btnSwitchCamera)

        tvStorageInfo.text = loopManager.getStorageInfo()

        btnSwitchCamera.setOnClickListener {
            cameraHelper.switchCamera()
        }

        btnShutter.setOnClickListener {
            if (!isRecording) {
                startRecording()
                shutterInner.layoutParams = shutterInner.layoutParams.apply {
                    width = 40
                    height = 40
                }
                tvRecTimer.visibility = View.VISIBLE
            } else {
                stopRecording()
                shutterInner.layoutParams = shutterInner.layoutParams.apply {
                    width = 168
                    height = 168
                }
                tvRecTimer.visibility = View.GONE
            }
            isRecording = !isRecording
        }

        btnToggleSpeed.setOnClickListener {
            renderer.showSpeed = !renderer.showSpeed
            btnToggleSpeed.alpha = if (renderer.showSpeed) 1.0f else 0.5f
        }
    }

    private fun startRecording() {
        val videoFile = loopManager.createNewFile()
        videoEncoder = VideoEncoder().apply {
            prepare(videoFile, 1920, 1080, 8000000, 60)
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
            cameraHelper.openCamera(surfaceTexture, 1920, 1080)
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
