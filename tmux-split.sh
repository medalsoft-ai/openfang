#!/bin/bash

# OpenFang Tauri + React 左右分屏模式
# 左边前端，右边Tauri

SESSION_NAME="openfang-split"
PROJECT_DIR="/Users/rain/project/innovation/empower/openfang"

tmux has-session -t $SESSION_NAME 2>/dev/null && tmux kill-session -t $SESSION_NAME

tmux new-session -d -s $SESSION_NAME -n "dev"

# 水平分割窗口
tmux split-window -h -t $SESSION_NAME:0

# 左边：前端
tmux send-keys -t $SESSION_NAME:0.0 "cd $PROJECT_DIR/crates/openfang-webui && pnpm dev" C-m

# 右边：Tauri
tmux send-keys -t $SESSION_NAME:0.1 "cd $PROJECT_DIR/crates/openfang-desktop && cargo tauri dev --no-watch" C-m

# 调整宽度（可选）
tmux resize-pane -t $SESSION_NAME:0.0 -x 80

tmux attach -t $SESSION_NAME
