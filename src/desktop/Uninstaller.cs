using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using Microsoft.Win32;

namespace YugiohCardStudio
{
    static class Uninstaller
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            DialogResult dr = MessageBox.Show(
                "确定要从您的计算机上卸载「游戏王AI制卡器」吗？",
                "卸载确认",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (dr != DialogResult.Yes) return;

            try
            {
                string installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');

                // 1. 删除桌面快捷方式
                string desktopShortcut = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
                    "游戏王AI制卡器.lnk"
                );
                if (File.Exists(desktopShortcut)) File.Delete(desktopShortcut);

                // 2. 删除开始菜单快捷方式
                string startMenuShortcut = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
                    "Programs",
                    "游戏王AI制卡器.lnk"
                );
                if (File.Exists(startMenuShortcut)) File.Delete(startMenuShortcut);

                // 3. 删除注册表卸载项
                try
                {
                    Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\游戏王AI制卡器", false);
                }
                catch { }

                // 4. 自毁删除整个安装目录
                string cmd = string.Format(
                    "/c ping 127.0.0.1 -n 2 > nul & rmdir /s /q \"{0}\"",
                    installDir
                );

                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", cmd);
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                Process.Start(psi);

                MessageBox.Show("「游戏王AI制卡器」已成功卸载！", "卸载完成", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("卸载过程中发生错误: " + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
