document.getElementById('calculate').addEventListener('click', function() {
    var targetAddress = document.getElementById('targetAddress').value;
    var outputDiv = document.getElementById('output');
    var steps = [
        'fetching transaction history...',
        'fetching asset list...',
        'fetching on-chain social status...',
        'analyzing portrait...',
        'analyzing social graph...',
        'calculating compatibility...',
        // 'calculating BlockTargeter score..' 这一步将在获取分数后输出
    ];

    if (!targetAddress) {
        outputDiv.textContent = 'Please enter a target address.';
        return;
    }

    // 清空输出区域，先输出地址信息，然后是步骤信息
    outputDiv.textContent = 'BlockTargeting: ' + targetAddress + '\n';

    var stepIndex = 0;
    var intervalId = setInterval(function() {
        if (stepIndex < steps.length) {
            outputDiv.textContent += steps[stepIndex] + '\n';
            stepIndex++;
        } else {
            clearInterval(intervalId);
            // 'calculating BlockTargeter score..' 此步骤在获取分数之前输出
            outputDiv.textContent += 'calculating BlockTargeter score..' + '\n';
            fetchScore(targetAddress); // 然后获取分数
        }
    }, 1000);

    function fetchScore(address) {
        // 发送 POST 请求到服务器以获取分数
        fetch('http://localhost:3000/push-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetAddress: address })
        })
        .then(response => response.json())
        .then(data => {
            if (data.score) {
                outputDiv.textContent += 'Score: ' + data.score + '\n';
            } else {
                outputDiv.textContent += 'Error fetching score.\n';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            outputDiv.textContent += 'Error fetching score.\n';
        });
    }
});
