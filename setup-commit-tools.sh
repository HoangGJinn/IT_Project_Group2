#!/bin/bash

echo "🔧 Đang cài đặt các công cụ commit..."

# Cài đặt dependencies
npm install

# Khởi tạo Husky
npx husky install

# Tạo commit-msg hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'

# Tạo pre-commit hook
npx husky add .husky/pre-commit 'npx lint-staged'

echo "✅ Đã cài đặt xong!"
echo ""
echo "📝 Các công cụ đã được cài đặt:"
echo "   - Husky: Git hooks"
echo "   - Commitlint: Kiểm tra commit message"
echo "   - Prettier: Format code"
echo "   - ESLint: Lint code"
echo "   - Lint-staged: Chạy checks trước khi commit"
echo ""
echo "🚀 Bây giờ bạn có thể commit với format:"
echo "   git commit -m 'feat(backend): thêm tính năng mới'"

