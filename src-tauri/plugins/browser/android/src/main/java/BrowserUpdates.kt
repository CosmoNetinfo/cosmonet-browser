package info.cosmonet.browser.nativebridge

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.ByteArrayOutputStream
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import javax.net.ssl.HttpsURLConnection

/** Only the trusted browser UI can reach this class. Download URLs never come from JS. */
class BrowserUpdates(private val activity: Activity) {
    private data class Update(val version: String, val url: String, val digest: String, val size: Long)
    private val worker = Executors.newSingleThreadExecutor()
    private val busy = AtomicBoolean(false)
    @Volatile private var selected: Update? = null
    @Volatile private var ready: File? = null
    private val folder get() = File(activity.cacheDir, "updates").apply { mkdirs() }
    private val packageInfo get() = activity.packageManager.getPackageInfo(activity.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
    private fun versionCode(value: String): Long {
        require(Regex("[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}").matches(value))
        val parts=value.split('.').map { it.toLong() }
        return parts[0]*1_000_000+parts[1]*1_000+parts[2]
    }
    private fun openConnection(address: String, depth: Int = 0): HttpsURLConnection {
        require(depth < 6)
        val url=URL(address)
        require(url.protocol == "https" && url.userInfo == null && url.port in listOf(-1,443))
        require(url.host in listOf("api.github.com", "github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"))
        val connection=url.openConnection() as HttpsURLConnection
        connection.connectTimeout=15_000;connection.readTimeout=60_000;connection.instanceFollowRedirects=false
        connection.setRequestProperty("User-Agent", "CosmoBrowser-Updater")
        connection.setRequestProperty("Accept", if(url.host=="api.github.com") "application/vnd.github+json" else "application/octet-stream")
        val code=connection.responseCode
        if(code in listOf(301,302,303,307,308)) {
            val next=URL(url,connection.getHeaderField("Location")).toString();connection.disconnect()
            return openConnection(next,depth+1)
        }
        if(code!=200) { connection.disconnect();error("HTTP $code") }
        return connection
    }
    private fun checkUpdates(): JSObject {
        val c=openConnection("https://api.github.com/repos/CosmoNetinfo/cosmonet-browser/releases?per_page=30")
        val releases=try {
            val bytes=c.inputStream.use { input ->
                val output=ByteArrayOutputStream();val buffer=ByteArray(16384)
                while(true) { val count=input.read(buffer);if(count<0)break;require(output.size()+count<=2_000_000);output.write(buffer,0,count) }
                output.toByteArray()
            }
            JSONArray(String(bytes,Charsets.UTF_8))
        } finally { c.disconnect() }
        val current=packageInfo.longVersionCode
        val candidates=(0 until releases.length()).mapNotNull { index ->
            val release=releases.getJSONObject(index)
            val version=release.optString("tag_name").removePrefix("v")
            val code=try { versionCode(version) } catch (_: Exception) { return@mapNotNull null }
            if(release.optBoolean("draft") || code<=current) return@mapNotNull null
            val name="Cosmo-Browser-$version-Android-arm64.apk"
            val assets=release.optJSONArray("assets") ?: return@mapNotNull null
            val asset=(0 until assets.length()).map { assets.getJSONObject(it) }.firstOrNull { it.optString("name")==name } ?: return@mapNotNull null
            val digest=asset.optString("digest")
            if(!Regex("sha256:[a-f0-9]{64}").matches(digest)) return@mapNotNull null
            val url=asset.optString("browser_download_url")
            if(url!="https://github.com/CosmoNetinfo/cosmonet-browser/releases/download/v$version/$name") return@mapNotNull null
            val size=asset.optLong("size")
            if(size !in 1..100_000_000) return@mapNotNull null
            Update(version,url,digest.removePrefix("sha256:"),size)
        }
        val latest=candidates.maxByOrNull { versionCode(it.version) }
        if(selected!=latest) ready=null
        selected=latest
        return JSObject().apply { put("available",latest!=null);put("version",latest?.version ?: packageInfo.versionName);put("ready",ready!=null) }
    }
    private fun download(): JSObject {
        val update=selected ?: error("Controlla prima gli aggiornamenti")
        val partial=File(folder,"browser.apk.tmp")
        val destination=File(folder,"browser.apk")
        ready=null
        try {
            val digest=MessageDigest.getInstance("SHA-256")
            val c=openConnection(update.url)
            var length=0L
            try { c.inputStream.use { source -> partial.outputStream().use { output ->
                val buffer=ByteArray(65536)
                while(true) {
                    check(!Thread.currentThread().isInterrupted)
                    val count=source.read(buffer);if(count<0)break
                    length+=count;require(length<=update.size)
                    digest.update(buffer,0,count);output.write(buffer,0,count)
                }
            } } } finally { c.disconnect() }
            require(length==update.size && digest.digest().joinToString("") { "%02x".format(it) }==update.digest)
            val apk=activity.packageManager.getPackageArchiveInfo(partial.absolutePath,PackageManager.GET_SIGNING_CERTIFICATES) ?: error("APK non valido")
            val installed=packageInfo
            require(apk.packageName==activity.packageName && apk.longVersionCode==versionCode(update.version) && apk.longVersionCode>installed.longVersionCode)
            val expected=installed.signingInfo?.apkContentsSigners?.map { it.toCharsString() }?.sorted() ?: error("Firma corrente non disponibile")
            val actual=apk.signingInfo?.apkContentsSigners?.map { it.toCharsString() }?.sorted() ?: error("Firma APK non disponibile")
            require(actual.isNotEmpty() && actual==expected)
            if(destination.exists()) require(destination.delete())
            require(partial.renameTo(destination));ready=destination
            return JSObject().apply { put("ready",true);put("version",update.version) }
        } finally { partial.delete() }
    }
    private fun install(invoke: Invoke) {
        val file=ready ?: error("Scarica prima l'aggiornamento")
        require(file.isFile)
        if(!activity.packageManager.canRequestPackageInstalls()) {
            activity.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:${activity.packageName}")))
            invoke.resolve(JSObject().apply { put("permissionRequired",true) });return
        }
        val uri=FileProvider.getUriForFile(activity,"${activity.packageName}.fileprovider",file)
        activity.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        invoke.resolve(JSObject().apply { put("installerOpened",true) })
    }
    fun dispatch(action: String, invoke: Invoke) {
        if(action=="update_install") {
            try { check(!busy.get());install(invoke) } catch (_: Exception) { invoke.reject("Installazione non disponibile. Scarica nuovamente l'aggiornamento e riprova.") }
            return
        }
        if(!busy.compareAndSet(false,true)) { invoke.reject("Aggiornamento già in corso");return }
        worker.execute {
            try { val result=when(action) { "update_check" -> checkUpdates();"update_download" -> download();else -> error("Comando non valido") };activity.runOnUiThread { invoke.resolve(result) } }
            catch (_: Exception) { activity.runOnUiThread { invoke.reject("Aggiornamento non riuscito: controlla la connessione. Sono accettati solo APK ufficiali con firma e checksum validi.") } }
            finally { busy.set(false) }
        }
    }
    fun close() { worker.shutdownNow() }
}
