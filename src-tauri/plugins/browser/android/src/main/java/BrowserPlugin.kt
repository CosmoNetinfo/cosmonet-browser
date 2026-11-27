package info.cosmonet.browser.nativebridge

import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Environment
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONArray
import org.json.JSONObject

@TauriPlugin
class BrowserPlugin(private val activity: Activity) : Plugin(activity) {
    private lateinit var toolbar: WebView
    private val tabs = mutableMapOf<String, WebView>()
    private val keyAlias = "info.cosmonet.browser.vault.v1"
    private val vaultFile by lazy { AtomicFile(File(activity.filesDir, "cosmo-vault.aes")) }

    override fun load(webView: WebView) {
        toolbar = webView
        toolbar.importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
        (activity as? ComponentActivity)?.onBackPressedDispatcher?.addCallback(object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                toolbar.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false;})()") { closed ->
                    if (closed == "true") return@evaluateJavascript
                    val current=tabs.values.firstOrNull { it.visibility==View.VISIBLE }
                    if (current?.canGoBack()==true) current.goBack()
                    else { isEnabled=false;(activity as ComponentActivity).onBackPressedDispatcher.onBackPressed();isEnabled=true }
                }
            }
        })
    }

    private fun emit(label: String, values: JSONObject) {
        if (!::toolbar.isInitialized) return
        values.put("label", label)
        val script = "window.dispatchEvent(new CustomEvent('android-browser-event',{detail:$values}));"
        toolbar.evaluateJavascript(script, null)
    }

    private fun update(label: String, view: WebView, loading: Boolean? = null) {
        val data = JSONObject().put("url", view.url ?: "").put("title", view.title ?: "Scheda")
            .put("back", view.canGoBack()).put("forward", view.canGoForward())
        if (loading != null) data.put("loading", loading)
        emit(label, data)
    }

    private fun webUrl(value: String): Uri {
        val uri = Uri.parse(value)
        require(uri.scheme in listOf("https", "http") && !uri.host.isNullOrEmpty() && uri.userInfo == null)
        return uri
    }

    private fun origin(value: String): String {
        val uri = webUrl(value)
        val port = if (uri.port == -1 || (uri.scheme == "https" && uri.port == 443) || (uri.scheme == "http" && uri.port == 80)) "" else ":${uri.port}"
        return "${uri.scheme}://${uri.host!!.lowercase()}$port"
    }

    private fun bounds(view: WebView, value: JSONObject) {
        val density = activity.resources.displayMetrics.density
        val ui = IntArray(2); val parent = IntArray(2)
        toolbar.getLocationInWindow(ui)
        (toolbar.parent as View).getLocationInWindow(parent)
        val params = FrameLayout.LayoutParams((value.getDouble("width") * density).toInt(), (value.getDouble("height") * density).toInt())
        params.leftMargin = ui[0] - parent[0] + (value.getDouble("x") * density).toInt()
        params.topMargin = ui[1] - parent[1] + (value.getDouble("y") * density).toInt()
        view.layoutParams = params
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun create(label: String, box: JSONObject): WebView {
        require(::toolbar.isInitialized && !tabs.containsKey(label) && tabs.size < 32)
        val view = WebView(activity)
        view.visibility = View.GONE
        view.importantForAutofill = View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = false
            safeBrowsingEnabled = true
            @Suppress("DEPRECATION")
            setSavePassword(false)
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, false)
        // Content WebViews receive NO JavaScript/native interface or Tauri IPC.
        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return try { webUrl(request.url.toString()); false } catch (_: Exception) { true }
            }
            override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) { update(label, view, true) }
            override fun onPageFinished(view: WebView, url: String?) { update(label, view, false) }
            override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) { update(label, view) }
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.cancel()
                emit(label, JSONObject().put("error", "Certificato del sito non valido: connessione interrotta").put("loading", false))
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) emit(label, JSONObject().put("error", "Impossibile caricare questa pagina").put("loading", false))
            }
        }
        view.webChromeClient = object : WebChromeClient() {
            override fun onReceivedTitle(view: WebView, title: String?) { update(label, view) }
            override fun onPermissionRequest(request: PermissionRequest) { request.deny() }
            override fun onCreateWindow(view: WebView, dialog: Boolean, gesture: Boolean, result: android.os.Message): Boolean {
                if (!gesture) return false
                val popup = WebView(activity)
                popup.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                        try { webUrl(r.url.toString()); emit(label, JSONObject().put("newTab", r.url.toString())) } catch (_: Exception) { }
                        popup.destroy()
                        return true
                    }
                }
                (result.obj as WebView.WebViewTransport).webView = popup
                result.sendToTarget()
                return true
            }
        }
        view.setDownloadListener { url, agent, disposition, mime, _ ->
            try {
                val uri = webUrl(url)
                val request = DownloadManager.Request(uri)
                    .setTitle(URLUtil.guessFileName(url, disposition, mime))
                    .setMimeType(mime)
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, URLUtil.guessFileName(url, disposition, mime))
                CookieManager.getInstance().getCookie(url)?.let { request.addRequestHeader("Cookie", it) }
                request.addRequestHeader("User-Agent", agent)
                (activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
                emit(label, JSONObject().put("notice", "Download avviato"))
            } catch (_: Exception) { emit(label, JSONObject().put("error", "Download non disponibile")) }
        }
        (toolbar.parent as ViewGroup).addView(view)
        bounds(view, box)
        tabs[label] = view
        return view
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (store.containsAlias(keyAlias)) return store.getKey(keyAlias, null) as SecretKey
        require(!vaultFile.baseFile.exists()) { "Chiave dell'archivio non disponibile" }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(keyAlias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256).build())
        }.generateKey()
    }

    private fun readVault(): JSONArray {
        if (!vaultFile.baseFile.exists()) return JSONArray()
        val envelope = JSONObject(String(vaultFile.readFully(), Charsets.UTF_8))
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)))
        val plain = cipher.doFinal(Base64.decode(envelope.getString("ciphertext"), Base64.NO_WRAP))
        try { return JSONArray(String(plain, Charsets.UTF_8)) } finally { plain.fill(0) }
    }

    private fun writeVault(entries: JSONArray) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val plain = entries.toString().toByteArray(Charsets.UTF_8)
        val encrypted = try { cipher.doFinal(plain) } finally { plain.fill(0) }
        val data = JSONObject().put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .put("ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP)).toString().toByteArray()
        val stream = vaultFile.startWrite()
        try { stream.write(data); vaultFile.finishWrite(stream) } catch (error: Exception) { vaultFile.failWrite(stream); throw error }
    }

    private fun vault(action: String, view: WebView, data: JSONObject): JSObject {
        var entries = readVault()
        val current = try { origin(view.url ?: "") } catch (_: Exception) { "" }
        if (action == "vault_save") {
            require(current.startsWith("https://") && !current.startsWith("https://home.cosmo.local"))
            val user = data.getString("user"); val secret = data.getString("secret")
            require(user.length <= 512 && secret.isNotEmpty() && secret.length <= 4096 && entries.length() < 500)
            entries = JSONArray((0 until entries.length()).map { entries.getJSONObject(it) }
                .filterNot { it.getString("origin") == current && it.getString("user") == user })
            entries.put(JSONObject().put("id", java.util.UUID.randomUUID().toString()).put("origin", current).put("user", user).put("secret", secret))
            writeVault(entries)
        }
        if (action == "vault_delete") {
            entries = JSONArray((0 until entries.length()).map { entries.getJSONObject(it) }.filterNot { it.getString("id") == data.getString("id") })
            writeVault(entries)
        }
        if (action == "vault_fill") {
            require(current.startsWith("https://"))
            val entry = (0 until entries.length()).map { entries.getJSONObject(it) }
                .first { it.getString("id") == data.getString("id") && it.getString("origin") == current }
            view.evaluateJavascript("(()=>{const e=$entry;if(location.origin!==e.origin||window!==top)return;const p=document.querySelector('input[type=password]');if(!p)return;const f=p.form||document;const u=f.querySelector('input[type=email],input[autocomplete=username],input[type=text]');if(u){u.value=e.user;u.dispatchEvent(new Event('input',{bubbles:true}));}p.value=e.secret;p.dispatchEvent(new Event('input',{bubbles:true}));})()", null)
        }
        val publicEntries = JSONArray((0 until entries.length()).map {
            val e = entries.getJSONObject(it)
            JSONObject().put("id", e.getString("id")).put("origin", e.getString("origin")).put("user", e.getString("user"))
        })
        return JSObject().put("entries", publicEntries) as JSObject
    }

    @Command
    fun dispatch(invoke: Invoke) {
        val args = invoke.getArgs()
        activity.runOnUiThread {
            try {
                val action = args.getString("action"); val label = args.getString("label")
                val data = args.optJSONObject("data") ?: JSONObject()
                if (action == "create") {
                    val view = create(label, args.getJSONObject("bounds"))
                    val url = args.getString("url")
                    if (url == "home") view.loadDataWithBaseURL("https://home.cosmo.local/", data.getString("html"), "text/html", "UTF-8", null)
                    else view.loadUrl(webUrl(url).toString())
                    invoke.resolve(JSObject()); return@runOnUiThread
                }
                val view = tabs[label] ?: error("Scheda non disponibile")
                if (action.startsWith("vault_")) { invoke.resolve(vault(action, view, data)); return@runOnUiThread }
                when (action) {
                    "activate" -> tabs.forEach { (key, value) -> value.visibility = if (key == label) View.VISIBLE else View.GONE }
                    "hide" -> view.visibility = View.GONE
                    "bounds" -> bounds(view, args.getJSONObject("bounds"))
                    "navigate" -> if (args.getString("url") == "home") view.loadDataWithBaseURL("https://home.cosmo.local/", data.getString("html"), "text/html", "UTF-8", null) else view.loadUrl(webUrl(args.getString("url")).toString())
                    "back" -> if (view.canGoBack()) view.goBack()
                    "forward" -> if (view.canGoForward()) view.goForward()
                    "reload" -> view.reload()
                    "close" -> { (view.parent as ViewGroup).removeView(view); view.destroy(); tabs.remove(label) }
                    "devtools", "console" -> view.evaluateJavascript(data.getString("script"), null)
                    "theme" -> {
                        if ((view.url ?: "").startsWith("https://home.cosmo.local/")) {
                            val theme=data.optString("theme", "system")
                            require(theme in listOf("system", "light", "dark", "sand"))
                            view.evaluateJavascript("document.documentElement.dataset.theme=${JSONObject.quote(theme)};",null)
                        }
                    }
                    "reader" -> {
                        require(origin(view.url ?: "") in listOf("https://www.cosmonet.info", "https://cosmonet.info"))
                        view.evaluateJavascript(data.getString("script"), null)
                    }
                    else -> error("Operazione non supportata")
                }
                if (action != "close") update(label, view)
                invoke.resolve(JSObject())
            } catch (_: Exception) { invoke.reject("Operazione non disponibile. Verifica il sito e riprova.") }
        }
    }

    override fun onDestroy() { tabs.values.forEach { it.destroy() }; tabs.clear() }
}
