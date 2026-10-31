package ca.iptvtoronto.personalstb

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.content.Context
import android.widget.*
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : Activity() {
 private val prefs by lazy { getSharedPreferences("profiles", Context.MODE_PRIVATE) }
 private lateinit var list: LinearLayout
 override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); render() }
 private fun profiles(): JSONArray = JSONArray(prefs.getString("items", "[]"))
 private fun render() {
  val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(28, 36, 28, 20) }
  root.addView(TextView(this).apply { text = "Personal STB • Profiles"; textSize = 24f })
  root.addView(TextView(this).apply { text = "Save and edit portal URL and MAC address. No streaming engine is included in this initial build." })
  root.addView(Button(this).apply { text = "Add profile"; setOnClickListener { edit(-1) } })
  list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }; root.addView(list)
  setContentView(ScrollView(this).apply { addView(root) })
  val items = profiles()
  for (i in 0 until items.length()) {
   val item = items.getJSONObject(i)
   list.addView(Button(this).apply { text = item.optString("name") + "  •  " + item.optString("mac"); setOnClickListener { edit(i) } })
  }
 }
 private fun edit(index: Int) {
  val items = profiles(); val old = if(index >= 0) items.getJSONObject(index) else JSONObject()
  val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24,8,24,8) }
  fun field(hint: String, value: String): EditText = EditText(this).apply { this.hint = hint; setSingleLine(true); setText(value); layout.addView(this) }
  val name = field("Profile name",old.optString("name")); val portal = field("Portal URL (https://...)",old.optString("portal")); val mac = field("MAC (00:1A:79:...)",old.optString("mac"))
  val dialog = AlertDialog.Builder(this).setTitle(if(index < 0) "New profile" else "Edit profile").setView(layout)
   .setPositiveButton("Save",null).setNegativeButton("Cancel",null)
  if(index >= 0) dialog.setNeutralButton("Delete") { _,_ -> val next=JSONArray(); for(i in 0 until items.length()) if(i!=index) next.put(items.getJSONObject(i)); prefs.edit().putString("items",next.toString()).apply(); render() }
  val shown=dialog.create(); shown.setOnShowListener {
   shown.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
    val url=portal.text.toString().trim(); val address=mac.text.toString().trim().uppercase()
    if(name.text.isBlank() || !url.startsWith("https://") || !Regex("(?i)^([0-9a-f]{2}:){5}[0-9a-f]{2}$").matches(address)) { Toast.makeText(this,"Enter a name, HTTPS portal, and valid MAC",Toast.LENGTH_LONG).show(); return@setOnClickListener }
    val obj=JSONObject().put("name",name.text.toString().trim()).put("portal",url).put("mac",address)
    if(index>=0) items.put(index,obj) else items.put(obj)
    prefs.edit().putString("items",items.toString()).apply(); shown.dismiss(); render()
   }
  }; shown.show()
 }
}
