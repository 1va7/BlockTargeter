#!/bin/bash

echo "正在关闭可能还在运行的服务..."

# 关闭在端口3000和8545上的服务
kill $(lsof -t -i:3000) > /dev/null 2>&1
kill $(lsof -t -i:8545) > /dev/null 2>&1

# 等待一小段时间确保端口已被释放
sleep 1

echo "启动新服务..."

# 启动Hardhat节点，并等待其完全启动
npm run localhost-node | tee localhost-node.log &
echo "正在等待Hardhat节点启动..."

# 等待端口8545开始监听
while ! nc -z localhost 8545; do   
  sleep 1 # 等待1秒
  echo "等待端口8545..."
done
echo "Hardhat节点已启动。"

# 现在可以启动其他服务
npm run localhost-deploy | tee localhost-deploy.log &
npx @phala/fn watch 0x5FbDB2315678afecb367f032d93F642f64180aa3 artifacts/contracts/OracleConsumerContract.sol/OracleConsumerContract.json dist/index.js -a '{"apiUrl": "https://api.airstack.xyz/gql", "apiKey": "3a41775a358a4cb99ca9a29c1f6fc486"}' | tee phala-watch.log &
node server.js | tee server.log &

echo "所有服务已在后台启动。"
