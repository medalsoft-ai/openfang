#!/bin/bash

# OpenFang Tauri + React 开发环境启动脚本
# 使用方法: ./tmux-dev.sh

SESSION_NAME="openfang-dev"
PROJECT_DIR="/Users/rain/project/innovation/empower/openfang"

# 检查tmux会话是否已存在
tmux has-session -t $SESSION_NAME 2>/dev/null

if [ $? == 0 ]; then
    echo "⚠️  会话 '$SESSION_NAME' 已存在，正在附加..."
    tmux attach -t $SESSION_NAME
    exit 0
fi

# 创建新会话（后台运行）
echo "🚀 启动 OpenFang 开发环境..."

# 第一个窗口: 前端 (React + Vite)
tmux new-session -d -s $SESSION_NAME -n "frontend"
tmux send-keys -t $SESSION_NAME:0 "cd $PROJECT_DIR/crates/openfang-webui && echo '🌐 启动前端开发服务器...' && pnpm dev" C-m

# 第二个窗口: Tauri
tmux new-window -t $SESSION_NAME -n "tauri"
tmux send-keys -t $SESSION_NAME:1 "cd $PROJECT_DIR/crates/openfang-desktop && echo '🦀 启动 Tauri 开发模式...' && cargo tauri dev --no-watch" C-m

# 第三个窗口: 日志/Shell
tmux new-window -t $SESSION_NAME -n "shell"
tmux send-keys -t $SESSION_NAME:2 "cd $PROJECT_DIR && echo '📋 这是shell窗口，可以在这里运行命令' && echo '常用命令:' && echo '  curl http://127.0.0.1:4200/api/health' && echo '  cargo build --workspace' && echo ''" C-m

# 配置状态栏样式
tmux set-option -t $SESSION_NAME status-style bg=colour234,fg=colour250
tmux set-window-option -t $SESSION_NAME:0 window-status-style bg=colour33,fg=white
tmux set-window-option -t $SESSION_NAME:1 window-status-style bg=colour196,fg=white

# 切换到前端窗口并附加到会话
tmux select-window -t $SESSION_NAME:0
tmux attach -t $SESSION_NAME
