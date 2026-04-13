# 🍉 Watermelon BLAST Tool

一个基于 **Watermelon (97103) v2.5 Genome** 的在线 BLAST 序列比对工具。  
该项目支持 DNA 短序列的本地比对查询，提供中文界面、阈值筛选、命中序列过滤、最佳命中显示、覆盖率计算和结果下载等功能。

---

## 项目简介

本项目是一个部署在 Linux 云服务器上的 Web BLAST 工具，面向西瓜基因组（97103 v2.5）进行 nucleotide-to-nucleotide（n 对 n）序列比对。

相比基础版 BLAST 页面，本项目增加了更适合展示和使用的功能，包括：

- 中文专业版界面
- 支持纯序列输入与 FASTA 输入
- 支持多条 FASTA 序列批量查询
- 支持命中序列筛选（如 Cla97Chr03）
- 支持“仅显示最佳命中（Top hit）”
- 支持按 E-value / Bit score / 相似度 / 覆盖率排序
- 支持“相同 / 部分匹配 / 未达阈值”自动判定
- 支持覆盖率计算
- 支持结果下载为 CSV / TXT
- 支持简单位置图可视化

---

## 主要功能

### 1. DNA 序列检索
用户可以输入 DNA 序列并提交 BLAST 查询。

### 2. FASTA 格式支持
支持以下两种输入方式：

#### 纯序列
```text
AAAACACATTTAAAGTCCAAGGACC
