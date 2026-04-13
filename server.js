const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = 3000;
const WEB_DIR = '/root/blast-web';
const DATA_DIR = '/root/blast-data';
const DB_PATH = path.join(DATA_DIR, 'watermelon_db');

app.use(express.static(WEB_DIR));

function isValidSequence(seq) {
  return /^[ACGTNacgtn]+$/.test(seq);
}

function sanitizeHeader(header) {
  return header.replace(/[^\w.-]/g, '_').slice(0, 50) || 'query';
}

function parseInputToFasta(input) {
  const text = (input || '').trim();
  if (!text) {
    throw new Error('请输入序列。');
  }

  const queryLengths = {};
  const fastaEntries = [];

  if (text.includes('>')) {
    const blocks = text.split(/^>/m).filter(Boolean);
    let idx = 1;

    for (const block of blocks) {
      const lines = block.split('\n');
      const rawHeader = (lines[0] || '').trim();
      const seq = lines.slice(1).join('').replace(/\s+/g, '').trim();

      if (!seq) continue;
      if (!isValidSequence(seq)) {
        throw new Error(`第 ${idx} 条 FASTA 序列含有非法字符，只允许 A/C/G/T/N。`);
      }

      const header = sanitizeHeader(rawHeader || `query${idx}`);
      fastaEntries.push({ header, seq });
      queryLengths[header] = seq.length;
      idx += 1;
    }
  } else {
    const seq = text.replace(/\s+/g, '').trim();
    if (!isValidSequence(seq)) {
      throw new Error('序列含有非法字符，只允许 A/C/G/T/N。');
    }
    fastaEntries.push({ header: 'query1', seq });
    queryLengths['query1'] = seq.length;
  }

  if (!fastaEntries.length) {
    throw new Error('未检测到有效序列。');
  }

  const fastaText = fastaEntries.map(e => `>${e.header}\n${e.seq}`).join('\n') + '\n';
  return { fastaText, queryLengths, queryCount: fastaEntries.length };
}

function runBlast(queryFile) {
  const args = [
    '-task', 'blastn-short',
    '-query', queryFile,
    '-db', DB_PATH,
    '-outfmt',
    '6 qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore'
  ];

  return new Promise((resolve, reject) => {
    execFile('blastn', args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || 'BLAST 执行失败。'));
      } else {
        resolve(stdout);
      }
    });
  });
}

function parseBlastRows(stdout) {
  const lines = (stdout || '').trim().split('\n').filter(Boolean);
  return lines.map(line => {
    const cols = line.split('\t');
    return {
      qseqid: cols[0] || '',
      sseqid: cols[1] || '',
      pident: Number(cols[2] || 0),
      length: Number(cols[3] || 0),
      mismatch: Number(cols[4] || 0),
      gapopen: Number(cols[5] || 0),
      qstart: Number(cols[6] || 0),
      qend: Number(cols[7] || 0),
      sstart: Number(cols[8] || 0),
      send: Number(cols[9] || 0),
      evalue: cols[10] || '',
      bitscore: Number(cols[11] || 0),
    };
  });
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/blast', async (req, res) => {
  try {
    const rawInput = req.body.sequence || '';
    const { fastaText, queryLengths, queryCount } = parseInputToFasta(rawInput);

    const ts = Date.now();
    const queryFile = path.join(DATA_DIR, `query_${ts}.fa`);

    await fsp.writeFile(queryFile, fastaText, 'utf8');
    const stdout = await runBlast(queryFile);
    const rows = parseBlastRows(stdout);

    try {
      await fsp.unlink(queryFile);
    } catch (_) {}

    res.json({
      rows,
      queryLengths,
      queryCount,
      database: 'Watermelon (97103) v2.5 Genome',
      program: 'blastn-short (nucleotide against nucleotide)'
    });
  } catch (err) {
    res.status(400).json({
      error: err.message || '请求处理失败。'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
