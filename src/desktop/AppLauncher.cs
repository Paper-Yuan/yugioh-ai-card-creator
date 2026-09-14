using System;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Diagnostics;
using System.Threading;
using System.Drawing;
using System.Windows.Forms;
using System.Reflection;

namespace YugiohCardStudio
{
    static class Program
    {
        private static HttpListener listener;
        private static string rootDir;
        private static int port = 38520;
        private static NotifyIcon trayIcon;

        [STAThread]
        static void Main()
        {
            bool createdNew;
            using (Mutex mutex = new Mutex(true, "YugiohCardStudio_SingleInstance_Mutex", out createdNew))
            {
                if (!createdNew)
                {
                    OpenAppWindow(port);
                    return;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);

                try
                {
                    // 确保本地应用静态资源就绪（优先使用就近 app 目录，否则从内嵌 payload.zip 解包到运行时缓存）
                    rootDir = EnsureAppFiles();

                    // 启动本地 HTTP 监听服务（带端口自动重试与避让）
                    for (int tryPort = 38520; tryPort <= 38535; tryPort++)
                    {
                        try
                        {
                            HttpListener testListener = new HttpListener();
                            testListener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", tryPort));
                            testListener.Start();
                            listener = testListener;
                            port = tryPort;
                            break;
                        }
                        catch
                        {
                            if (tryPort == 38535) throw;
                        }
                    }

                    ThreadPool.QueueUserWorkItem(ListenLoop);

                    // 初始化系统托盘图标
                    InitTrayIcon();

                    // 打开主程序窗口
                    OpenAppWindow(port);

                    // 消息循环（托盘常驻，超低内存占用）
                    Application.Run();
                }
                catch (Exception ex)
                {
                    MessageBox.Show("启动游戏王制卡器失败: " + ex.Message, "启动错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                finally
                {
                    if (listener != null)
                    {
                        try { listener.Stop(); } catch { }
                    }
                    if (trayIcon != null)
                    {
                        trayIcon.Visible = false;
                        trayIcon.Dispose();
                    }
                }
            }
        }

        private static string EnsureAppFiles()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string candidate1 = Path.Combine(baseDir, "app");
            string candidate2 = Path.Combine(baseDir, "dist", "web", "public");
            string candidate3 = baseDir;

            // 1. 若同级目录已存在 app 目录 (绿色便携文件夹模式)
            if (Directory.Exists(candidate1) && File.Exists(Path.Combine(candidate1, "index.html")))
            {
                return candidate1;
            }
            // 2. 若处于开发源码目录
            if (Directory.Exists(candidate2) && File.Exists(Path.Combine(candidate2, "index.html")))
            {
                return candidate2;
            }
            // 3. 若自身目录直接包含 index.html
            if (File.Exists(Path.Combine(candidate3, "index.html")))
            {
                return candidate3;
            }

            // 4. 单文件独立 EXE 模式：从内嵌 payload.zip 解包到 LocalApplicationData 独立缓存
            string appDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "YugiohCardStudio"
            );
            string runtimeApp = Path.Combine(appDataDir, "app");
            string stampFile = Path.Combine(appDataDir, "stamp.txt");

            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream zipStream = asm.GetManifestResourceStream("payload.zip"))
                {
                    if (zipStream != null)
                    {
                        long exeTime = 0;
                        try { exeTime = File.GetLastWriteTimeUtc(Application.ExecutablePath).Ticks; } catch { }

                        bool needExtract = true;
                        if (Directory.Exists(runtimeApp) && File.Exists(Path.Combine(runtimeApp, "index.html")) && File.Exists(stampFile))
                        {
                            try
                            {
                                string savedStamp = File.ReadAllText(stampFile).Trim();
                                if (savedStamp == exeTime.ToString())
                                {
                                    needExtract = false;
                                }
                            }
                            catch { }
                        }

                        if (needExtract)
                        {
                            if (!Directory.Exists(appDataDir)) Directory.CreateDirectory(appDataDir);
                            using (ZipArchive archive = new ZipArchive(zipStream))
                            {
                                ExtractArchiveSafe(archive, appDataDir);
                            }
                            try { File.WriteAllText(stampFile, exeTime.ToString()); } catch { }
                        }

                        if (Directory.Exists(runtimeApp) && File.Exists(Path.Combine(runtimeApp, "index.html")))
                        {
                            return runtimeApp;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("Extract payload failed: " + ex.Message);
            }

            if (Directory.Exists(runtimeApp) && File.Exists(Path.Combine(runtimeApp, "index.html")))
            {
                return runtimeApp;
            }

            return baseDir;
        }

        private static void ExtractArchiveSafe(ZipArchive archive, string targetPath)
        {
            string baseDirFullPath = Path.GetFullPath(targetPath);
            foreach (ZipArchiveEntry entry in archive.Entries)
            {
                string destinationPath = Path.GetFullPath(Path.Combine(targetPath, entry.FullName));
                if (!destinationPath.StartsWith(baseDirFullPath, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (string.IsNullOrEmpty(entry.Name))
                {
                    Directory.CreateDirectory(destinationPath);
                }
                else
                {
                    string parent = Path.GetDirectoryName(destinationPath);
                    if (!string.IsNullOrEmpty(parent) && !Directory.Exists(parent))
                    {
                        Directory.CreateDirectory(parent);
                    }
                    entry.ExtractToFile(destinationPath, true);
                }
            }
        }

        private static void InitTrayIcon()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Text = "游戏王AI制卡器 (双击打开)";

            try
            {
                System.Reflection.Assembly asm = System.Reflection.Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("app.ico"))
                {
                    if (s != null) trayIcon.Icon = new Icon(s);
                    else trayIcon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                }
            }
            catch
            {
                try { trayIcon.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
                catch { trayIcon.Icon = SystemIcons.Application; }
            }

            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("🎴 打开制卡器工作台", (s, e) => OpenAppWindow(port));
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("❌ 退出程序", (s, e) => KillSelfAndExit());

            trayIcon.ContextMenu = menu;
            trayIcon.DoubleClick += (s, e) => OpenAppWindow(port);
            trayIcon.Visible = true;
        }

        public static void KillSelfAndExit()
        {
            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
            }
            catch { }

            try
            {
                if (listener != null)
                {
                    listener.Stop();
                    listener.Close();
                }
            }
            catch { }

            try
            {
                Application.Exit();
            }
            catch { }

            try
            {
                Process.GetCurrentProcess().Kill();
            }
            catch { }

            Environment.Exit(0);
        }

        public static void OpenAppWindow(int p)
        {
            string targetUrl = string.Format("http://127.0.0.1:{0}/index.html", p);
            string browserPath = FindBrowserPath();
            string profileDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "YugiohCardStudio",
                "Profile"
            );

            if (!string.IsNullOrEmpty(browserPath) && File.Exists(browserPath))
            {
                try
                {
                    if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserPath;
                    psi.Arguments = string.Format(
                        "--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1440,900 --disable-features=msEdgeSidebarV2,msHub,EdgeAppTitleBar,AppTitlebar --no-first-run --no-default-browser-check", 
                        targetUrl, 
                        profileDir
                    );
                    psi.UseShellExecute = false;
                    Process browserProcess = Process.Start(psi);
                    if (browserProcess != null)
                    {
                        browserProcess.EnableRaisingEvents = true;
                        browserProcess.Exited += (s, e) => {
                            // 当用户关闭了独立制卡器窗口后，彻底杀死所有后台进程并退出
                            KillSelfAndExit();
                        };
                    }
                    return;
                }
                catch { }
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo(targetUrl);
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch { }
        }

        private static string FindBrowserPath()
        {
            string[] paths = new string[]
            {
                // Microsoft Edge
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                // Google Chrome
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
                // Brave
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"BraveSoftware\Brave-Browser\Application\brave.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"BraveSoftware\Brave-Browser\Application\brave.exe")
            };

            foreach (string p in paths)
            {
                try
                {
                    if (File.Exists(p)) return p;
                }
                catch { }
            }
            return null;
        }

        private static void ListenLoop(object state)
        {
            while (listener != null && listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch
                {
                    break;
                }
            }
        }

        private static void ProcessRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath;
                if (string.IsNullOrEmpty(rawUrl) || rawUrl == "/")
                {
                    rawUrl = "/index.html";
                }

                if (rawUrl == "/api/detect-local-ygopro")
                {
                    string detected = DetectLocalCdbPath();
                    string json = string.IsNullOrEmpty(detected) 
                        ? "{\"found\":false}" 
                        : string.Format("{{\"found\":true,\"path\":\"{0}\"}}", detected.Replace("\\", "\\\\"));
                    byte[] data = System.Text.Encoding.UTF8.GetBytes(json);
                    context.Response.ContentType = "application/json; charset=utf-8";
                    context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                    context.Response.OutputStream.Write(data, 0, data.Length);
                    return;
                }

                if (rawUrl == "/api/shutdown")
                {
                    byte[] data = System.Text.Encoding.UTF8.GetBytes("{\"success\":true,\"message\":\"正在杀死并退出进程...\"}");
                    context.Response.ContentType = "application/json; charset=utf-8";
                    context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                    context.Response.OutputStream.Write(data, 0, data.Length);
                    try { context.Response.OutputStream.Close(); } catch { }

                    ThreadPool.QueueUserWorkItem((o) => {
                        Thread.Sleep(200);
                        KillSelfAndExit();
                    });
                    return;
                }

                if (rawUrl == "/api/local-cdb")
                {
                    string detected = DetectLocalCdbPath();
                    if (!string.IsNullOrEmpty(detected) && File.Exists(detected))
                    {
                        byte[] cdbData = File.ReadAllBytes(detected);
                        context.Response.ContentType = "application/octet-stream";
                        context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                        context.Response.OutputStream.Write(cdbData, 0, cdbData.Length);
                        return;
                    }
                    context.Response.StatusCode = 404;
                    return;
                }


                string relativePath = rawUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                string filePath = Path.Combine(rootDir, relativePath);

                if (File.Exists(filePath))
                {
                    byte[] content = File.ReadAllBytes(filePath);
                    context.Response.ContentType = GetMimeType(filePath);
                    context.Response.ContentLength64 = content.Length;
                    context.Response.AddHeader("Cache-Control", "no-cache");
                    context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                    context.Response.OutputStream.Write(content, 0, content.Length);
                }
                else
                {
                    context.Response.StatusCode = 404;
                }
            }
            catch { }
            finally
            {
                try { context.Response.OutputStream.Close(); } catch { }
            }
        }

        private static string DetectLocalCdbPath()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] checkPaths = new string[]
            {
                @"D:\ygopro\cards.cdb",
                @"E:\ygopro\cards.cdb",
                @"C:\ygopro\cards.cdb",
                @"D:\YGOPro\cards.cdb",
                @"E:\YGOPro\cards.cdb",
                @"D:\mdpro3\cdb\cards.cdb",
                @"E:\mdpro3\cdb\cards.cdb",
                @"C:\mdpro3\cdb\cards.cdb",
                Path.Combine(appData, @"MyCardLibrary\cards.cdb"),
                Path.Combine(localAppData, @"mdpro3\cdb\cards.cdb"),
                @"C:\Program Files\ygopro\cards.cdb",
                @"C:\Program Files (x86)\ygopro\cards.cdb"
            };
            foreach (string p in checkPaths)
            {
                try
                {
                    if (File.Exists(p)) return p;
                }
                catch { }
            }
            return null;
        }

        private static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            switch (ext)
            {
                case ".html": case ".htm": return "text/html; charset=utf-8";
                case ".js": return "application/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".wasm": return "application/wasm";
                case ".json": return "application/json; charset=utf-8";
                case ".png": return "image/png";
                case ".jpg": case ".jpeg": return "image/jpeg";
                case ".webp": return "image/webp";
                case ".svg": return "image/svg+xml";
                case ".ico": return "image/x-icon";
                case ".woff2": return "font/woff2";
                case ".woff": return "font/woff";
                case ".ttf": return "font/ttf";
                default: return "application/octet-stream";
            }
        }
    }
}
