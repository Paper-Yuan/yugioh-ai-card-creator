using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using Microsoft.Win32;

namespace YugiohCardStudio
{
    public class SetupForm : Form
    {
        private int currentStep = 1;
        private string installDir;
        private CheckBox chkDesktop;
        private CheckBox chkStartMenu;
        private CheckBox chkLaunchNow;
        private TextBox txtPath;
        private ProgressBar progressBar;
        private Label lblStatus;
        private Label lblHeaderTitle;
        private Label lblHeaderSub;
        private Panel contentPanel;
        private Button btnNext;
        private Button btnBack;
        private Button btnCancel;

        public SetupForm()
        {
            InitializeComponent();
            installDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs",
                "游戏王AI制卡器"
            );
            ShowStep(1);
        }

        private void InitializeComponent()
        {
            this.Text = "游戏王AI制卡器 安装向导";
            this.Size = new Size(580, 420);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(16, 21, 34);
            this.ForeColor = Color.White;

            // 加载官方 YGOPro 专属图标
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("app.ico"))
                {
                    if (s != null) this.Icon = new Icon(s);
                    else this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                }
            }
            catch
            {
                try { this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            }

            // 顶部暗金横幅
            Panel banner = new Panel();
            banner.Dock = DockStyle.Top;
            banner.Height = 70;
            banner.BackColor = Color.FromArgb(24, 31, 48);
            banner.Paint += (s, e) =>
            {
                using (Pen p = new Pen(Color.FromArgb(245, 158, 11), 2))
                {
                    e.Graphics.DrawLine(p, 0, banner.Height - 1, banner.Width, banner.Height - 1);
                }
            };

            lblHeaderTitle = new Label();
            lblHeaderTitle.Text = "游戏王AI制卡器 - 安装程序";
            lblHeaderTitle.Font = new Font("Microsoft YaHei", 12, FontStyle.Bold);
            lblHeaderTitle.ForeColor = Color.FromArgb(245, 158, 11);
            lblHeaderTitle.Location = new Point(20, 14);
            lblHeaderTitle.AutoSize = true;

            lblHeaderSub = new Label();
            lblHeaderSub.Text = "纯离线引擎 · 免Electron轻量架构 · 专属暗金黑曜石工作室";
            lblHeaderSub.Font = new Font("Microsoft YaHei", 9);
            lblHeaderSub.ForeColor = Color.FromArgb(148, 163, 184);
            lblHeaderSub.Location = new Point(20, 40);
            lblHeaderSub.AutoSize = true;

            // 横幅右侧 YGOPro 官方徽标
            if (this.Icon != null)
            {
                PictureBox picBanner = new PictureBox();
                picBanner.Size = new Size(54, 54);
                picBanner.Location = new Point(505, 8);
                picBanner.SizeMode = PictureBoxSizeMode.Zoom;
                picBanner.Image = this.Icon.ToBitmap();
                banner.Controls.Add(picBanner);
            }

            banner.Controls.Add(lblHeaderTitle);
            banner.Controls.Add(lblHeaderSub);
            this.Controls.Add(banner);

            // 中间内容区
            contentPanel = new Panel();
            contentPanel.Location = new Point(20, 85);
            contentPanel.Size = new Size(525, 230);
            this.Controls.Add(contentPanel);

            // 底部控制按钮栏
            Panel bottomPanel = new Panel();
            bottomPanel.Dock = DockStyle.Bottom;
            bottomPanel.Height = 55;
            bottomPanel.BackColor = Color.FromArgb(12, 16, 26);

            btnCancel = new Button();
            btnCancel.Text = "取消";
            btnCancel.Location = new Point(460, 14);
            btnCancel.Size = new Size(80, 28);
            btnCancel.FlatStyle = FlatStyle.Flat;
            btnCancel.BackColor = Color.FromArgb(30, 41, 59);
            btnCancel.ForeColor = Color.White;
            btnCancel.Click += (s, e) => this.Close();

            btnNext = new Button();
            btnNext.Text = "下一步 >";
            btnNext.Location = new Point(370, 14);
            btnNext.Size = new Size(80, 28);
            btnNext.FlatStyle = FlatStyle.Flat;
            btnNext.BackColor = Color.FromArgb(245, 158, 11);
            btnNext.ForeColor = Color.Black;
            btnNext.Font = new Font("Microsoft YaHei", 9, FontStyle.Bold);
            btnNext.Click += BtnNext_Click;

            btnBack = new Button();
            btnBack.Text = "< 上一步";
            btnBack.Location = new Point(280, 14);
            btnBack.Size = new Size(80, 28);
            btnBack.FlatStyle = FlatStyle.Flat;
            btnBack.BackColor = Color.FromArgb(30, 41, 59);
            btnBack.ForeColor = Color.White;
            btnBack.Click += (s, e) => ShowStep(currentStep - 1);

            bottomPanel.Controls.Add(btnCancel);
            bottomPanel.Controls.Add(btnNext);
            bottomPanel.Controls.Add(btnBack);
            this.Controls.Add(bottomPanel);
        }

        private void ShowStep(int step)
        {
            currentStep = step;
            contentPanel.Controls.Clear();
            btnBack.Enabled = (step > 1 && step < 4);

            if (step == 1) // 欢迎
            {
                lblHeaderTitle.Text = "欢迎使用 游戏王AI制卡器 安装向导";
                lblHeaderSub.Text = "准备安装游戏王AI制卡工作室 v2.0";

                if (this.Icon != null)
                {
                    PictureBox picLogo = new PictureBox();
                    picLogo.Size = new Size(115, 115);
                    picLogo.Location = new Point(10, 20);
                    picLogo.SizeMode = PictureBoxSizeMode.Zoom;
                    picLogo.Image = this.Icon.ToBitmap();
                    contentPanel.Controls.Add(picLogo);
                }

                Label lblDesc = new Label();
                lblDesc.Text = "本安装向导将指引您在计算机上安装「游戏王AI制卡器」。\n\n" +
                               "本版本特性：\n" +
                               "• 彻底剥离 Electron 臃肿架构，运行内存仅 ~30MB\n" +
                               "• 100% 纯本地离线 Canvas 硬件加速渲染\n" +
                               "• 内置 WebAssembly SQLite 引擎，一键直出 YGOPro 扩展包\n" +
                               "• 零网络依赖，开箱即用\n\n" +
                               "点击「下一步」继续。";
                lblDesc.Font = new Font("Microsoft YaHei", 9.5f);
                lblDesc.ForeColor = Color.FromArgb(226, 232, 240);
                lblDesc.Location = new Point(140, 10);
                lblDesc.Size = new Size(375, 195);
                contentPanel.Controls.Add(lblDesc);
            }
            else if (step == 2) // 选择目录
            {
                lblHeaderTitle.Text = "选择安装位置";
                lblHeaderSub.Text = "请指定将游戏王AI制卡器安装到的目标文件夹";

                Label lblPrompt = new Label();
                lblPrompt.Text = "安装程序将把应用程序文件安装至以下文件夹中：";
                lblPrompt.Location = new Point(10, 15);
                lblPrompt.Size = new Size(500, 25);
                lblPrompt.Font = new Font("Microsoft YaHei", 9.5f);

                txtPath = new TextBox();
                txtPath.Text = installDir;
                txtPath.Location = new Point(10, 50);
                txtPath.Size = new Size(410, 26);
                txtPath.BackColor = Color.FromArgb(10, 15, 25);
                txtPath.ForeColor = Color.White;
                txtPath.Font = new Font("Microsoft YaHei", 9.5f);

                Button btnBrowse = new Button();
                btnBrowse.Text = "浏览...";
                btnBrowse.Location = new Point(430, 48);
                btnBrowse.Size = new Size(75, 28);
                btnBrowse.FlatStyle = FlatStyle.Flat;
                btnBrowse.BackColor = Color.FromArgb(30, 41, 59);
                btnBrowse.Click += (s, e) =>
                {
                    using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                    {
                        fbd.SelectedPath = txtPath.Text;
                        if (fbd.ShowDialog() == DialogResult.OK)
                        {
                            txtPath.Text = Path.Combine(fbd.SelectedPath, "游戏王AI制卡器");
                            installDir = txtPath.Text;
                        }
                    }
                };

                contentPanel.Controls.Add(lblPrompt);
                contentPanel.Controls.Add(txtPath);
                contentPanel.Controls.Add(btnBrowse);
            }
            else if (step == 3) // 快捷方式选项
            {
                lblHeaderTitle.Text = "选择快捷方式与选项";
                lblHeaderSub.Text = "配置系统快捷方式以方便日后快速访问";

                chkDesktop = new CheckBox();
                chkDesktop.Text = "在桌面上创建快捷方式";
                chkDesktop.Checked = true;
                chkDesktop.Location = new Point(15, 25);
                chkDesktop.Size = new Size(300, 30);
                chkDesktop.Font = new Font("Microsoft YaHei", 10);

                chkStartMenu = new CheckBox();
                chkStartMenu.Text = "在「开始菜单」创建程序快捷方式";
                chkStartMenu.Checked = true;
                chkStartMenu.Location = new Point(15, 65);
                chkStartMenu.Size = new Size(300, 30);
                chkStartMenu.Font = new Font("Microsoft YaHei", 10);

                contentPanel.Controls.Add(chkDesktop);
                contentPanel.Controls.Add(chkStartMenu);
            }
            else if (step == 4) // 安装中
            {
                lblHeaderTitle.Text = "正在安装...";
                lblHeaderSub.Text = "请稍候，正在部署应用文件并配置运行环境";
                btnBack.Enabled = false;
                btnNext.Enabled = false;
                btnCancel.Enabled = false;

                lblStatus = new Label();
                lblStatus.Text = "正在准备安装环境...";
                lblStatus.Location = new Point(15, 40);
                lblStatus.Size = new Size(490, 25);
                lblStatus.Font = new Font("Microsoft YaHei", 9.5f);

                progressBar = new ProgressBar();
                progressBar.Location = new Point(15, 75);
                progressBar.Size = new Size(490, 24);
                progressBar.Style = ProgressBarStyle.Marquee;

                contentPanel.Controls.Add(lblStatus);
                contentPanel.Controls.Add(progressBar);

                PerformInstall();
            }
            else if (step == 5) // 完成
            {
                lblHeaderTitle.Text = "安装成功完成！";
                lblHeaderSub.Text = "游戏王AI制卡器 已成功部署至您的计算机";
                btnBack.Visible = false;
                btnNext.Text = "完成";
                btnCancel.Visible = false;

                if (this.Icon != null)
                {
                    PictureBox picDone = new PictureBox();
                    picDone.Size = new Size(100, 100);
                    picDone.Location = new Point(15, 20);
                    picDone.SizeMode = PictureBoxSizeMode.Zoom;
                    picDone.Image = this.Icon.ToBitmap();
                    contentPanel.Controls.Add(picDone);
                }

                Label lblDone = new Label();
                lblDone.Text = "游戏王AI制卡器 (v2.0 独立免Electron版) 已安装完毕。\n\n" +
                               "安装路径: " + installDir + "\n\n" +
                               "您可以随时从桌面、开始菜单或系统「应用和功能」中管理此软件。";
                lblDone.Location = new Point(130, 15);
                lblDone.Size = new Size(385, 100);
                lblDone.Font = new Font("Microsoft YaHei", 9.5f);

                chkLaunchNow = new CheckBox();
                chkLaunchNow.Text = "立即启动 游戏王AI制卡器";
                chkLaunchNow.Checked = true;
                chkLaunchNow.Location = new Point(130, 130);
                chkLaunchNow.Size = new Size(300, 30);
                chkLaunchNow.Font = new Font("Microsoft YaHei", 10, FontStyle.Bold);
                chkLaunchNow.ForeColor = Color.FromArgb(245, 158, 11);

                contentPanel.Controls.Add(lblDone);
                contentPanel.Controls.Add(chkLaunchNow);
            }
        }

        private void BtnNext_Click(object sender, EventArgs e)
        {
            if (currentStep == 2)
            {
                installDir = txtPath.Text.Trim();
                if (string.IsNullOrEmpty(installDir))
                {
                    MessageBox.Show("请指定有效的安装路径", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                ShowStep(3);
            }
            else if (currentStep == 3)
            {
                ShowStep(4);
            }
            else if (currentStep == 5)
            {
                if (chkLaunchNow != null && chkLaunchNow.Checked)
                {
                    string targetExe = Path.Combine(installDir, "游戏王AI制卡器.exe");
                    if (File.Exists(targetExe))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo(targetExe);
                        psi.WorkingDirectory = installDir;
                        Process.Start(psi);
                    }
                }
                this.Close();
            }
            else
            {
                ShowStep(currentStep + 1);
            }
        }

        private void PerformInstall()
        {
            MethodInvoker action = delegate ()
            {
                try
                {
                    if (!Directory.Exists(installDir))
                    {
                        Directory.CreateDirectory(installDir);
                    }

                    // 1. 解压内嵌 payload 资源或临近 app 资源
                    UpdateStatus("正在解包核心制卡引擎与静态界面...");
                    ExtractPayload(installDir);

                    // 2. 创建快捷方式
                    UpdateStatus("正在创建桌面与开始菜单快捷方式...");
                    string targetExe = Path.Combine(installDir, "游戏王AI制卡器.exe");

                    if (chkDesktop != null && chkDesktop.Checked)
                    {
                        string deskLnk = Path.Combine(
                            Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
                            "游戏王AI制卡器.lnk"
                        );
                        CreateShortcut(deskLnk, targetExe, installDir, "游戏王AI制卡器 - 独立版");
                    }

                    if (chkStartMenu != null && chkStartMenu.Checked)
                    {
                        string startFolder = Path.Combine(
                            Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
                            "Programs"
                        );
                        if (!Directory.Exists(startFolder)) Directory.CreateDirectory(startFolder);
                        string startLnk = Path.Combine(startFolder, "游戏王AI制卡器.lnk");
                        CreateShortcut(startLnk, targetExe, installDir, "游戏王AI制卡器 - 独立版");
                    }

                    // 3. 注册到 Windows 卸载列表
                    UpdateStatus("正在注册系统控制面板卸载信息...");
                    RegisterUninstall(installDir, targetExe);

                    this.Invoke(new MethodInvoker(delegate () {
                        btnNext.Enabled = true;
                        ShowStep(5);
                    }));
                }
                catch (Exception ex)
                {
                    this.Invoke(new MethodInvoker(delegate () {
                        MessageBox.Show("安装失败: " + ex.Message, "安装错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        btnCancel.Enabled = true;
                    }));
                }
            };

            action.BeginInvoke(null, null);
        }

        private void UpdateStatus(string text)
        {
            if (lblStatus.InvokeRequired)
            {
                lblStatus.Invoke(new Action<string>(UpdateStatus), text);
            }
            else
            {
                lblStatus.Text = text;
            }
        }

        private void ExtractPayload(string targetPath)
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            Stream zipStream = asm.GetManifestResourceStream("payload.zip");

            if (zipStream != null)
            {
                using (ZipArchive archive = new ZipArchive(zipStream))
                {
                    ExtractArchiveSafe(archive, targetPath);
                }
            }
            else
            {
                // 如果当前目录有 payload.zip
                string localZip = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "payload.zip");
                if (File.Exists(localZip))
                {
                    using (ZipArchive archive = ZipFile.OpenRead(localZip))
                    {
                        ExtractArchiveSafe(archive, targetPath);
                    }
                }
                else
                {
                    // 拷贝当前目录下的 app/ 和可执行程序
                    string srcApp = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app");
                    if (Directory.Exists(srcApp))
                    {
                        CopyDirectory(srcApp, Path.Combine(targetPath, "app"));
                    }
                }
            }
        }

        private void ExtractArchiveSafe(ZipArchive archive, string targetPath)
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

        private void CopyDirectory(string sourceDir, string destinationDir)
        {
            DirectoryInfo dir = new DirectoryInfo(sourceDir);
            if (!Directory.Exists(destinationDir)) Directory.CreateDirectory(destinationDir);

            foreach (FileInfo file in dir.GetFiles())
            {
                file.CopyTo(Path.Combine(destinationDir, file.Name), true);
            }
            foreach (DirectoryInfo subDir in dir.GetDirectories())
            {
                CopyDirectory(subDir.FullName, Path.Combine(destinationDir, subDir.Name));
            }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string workDir, string desc)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = workDir;
                shortcut.Description = desc;
                shortcut.IconLocation = targetPath + ",0";
                shortcut.Save();
            }
            catch { }
        }

        private void RegisterUninstall(string dir, string exePath)
        {
            try
            {
                string uninstKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\游戏王AI制卡器";
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(uninstKey))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", "游戏王AI制卡器");
                        key.SetValue("DisplayVersion", "2.0.0");
                        key.SetValue("Publisher", "Yu-Gi-Oh! AI Card Studio");
                        key.SetValue("DisplayIcon", exePath);
                        key.SetValue("InstallLocation", dir);
                        key.SetValue("UninstallString", "\"" + Path.Combine(dir, "Uninstall.exe") + "\"");
                    }
                }
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try
            {
                Application.Run(new SetupForm());
            }
            catch (Exception ex)
            {
                MessageBox.Show("安装程序异常: " + ex.Message + "\n" + ex.StackTrace, "致命错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
