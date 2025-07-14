/**
 * DNSweeper 高度メトリクス可視化コンポーネント
 * Chart.js を使用したリアルタイムチャート表示
 */

import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler,
  type ChartConfiguration,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Chart.js プラグイン登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface ChartDataset {
  label: string;
  data: MetricDataPoint[];
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  fill?: boolean;
}

interface MetricsChartProps {
  type: 'line' | 'bar' | 'doughnut' | 'radar';
  title: string;
  datasets: ChartDataset[];
  height?: number;
  width?: string;
  realtime?: boolean;
  timeRange?: '1h' | '6h' | '24h' | '7d';
  showLegend?: boolean;
  showTooltip?: boolean;
  responsive?: boolean;
  animated?: boolean;
}

const defaultColors = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500  
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
];

export const MetricsChart: React.FC<MetricsChartProps> = ({
  type,
  title,
  datasets,
  height = 300,
  width = '100%',
  realtime = false,
  timeRange = '1h',
  showLegend = true,
  showTooltip = true,
  responsive = true,
  animated = true
}) => {
  const chartRef = useRef<any>(null);

  // リアルタイム更新
  useEffect(() => {
    if (realtime && chartRef.current) {
      const chart = chartRef.current;
      chart.update('none'); // アニメーションなしで更新
    }
  }, [datasets, realtime]);

  // データの前処理
  const processedData: ChartData<any> = {
    labels: type === 'doughnut' || type === 'radar' 
      ? datasets[0]?.data.map(d => d.label || d.timestamp) || []
      : datasets[0]?.data.map(d => new Date(d.timestamp)) || [],
    datasets: datasets.map((dataset, index) => ({
      label: dataset.label,
      data: type === 'doughnut' || type === 'radar'
        ? dataset.data.map(d => d.value)
        : dataset.data.map(d => ({ x: new Date(d.timestamp), y: d.value })),
      backgroundColor: dataset.backgroundColor || 
        (type === 'doughnut' ? defaultColors : `${defaultColors[index % defaultColors.length]}20`),
      borderColor: dataset.borderColor || defaultColors[index % defaultColors.length],
      borderWidth: 2,
      fill: dataset.fill !== undefined ? dataset.fill : (type === 'line'),
      tension: type === 'line' ? 0.4 : undefined,
      pointRadius: type === 'line' ? 3 : undefined,
      pointHoverRadius: type === 'line' ? 6 : undefined,
    }))
  };

  // チャートオプション
  const options: ChartOptions<any> = {
    responsive,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: realtime ? 500 : 1000,
      easing: 'easeInOutQuart'
    } : false,
    plugins: {
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        },
        color: '#1F2937'
      },
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: showTooltip,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          title: (context: any) => {
            if (type === 'doughnut' || type === 'radar') {
              return context[0].label;
            }
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString('ja-JP');
          },
          label: (context: any) => {
            const value = context.parsed.y || context.parsed;
            if (typeof value === 'number') {
              return `${context.dataset.label}: ${value.toLocaleString()}`;
            }
            return `${context.dataset.label}: ${value}`;
          }
        }
      }
    },
    scales: type === 'doughnut' || type === 'radar' ? undefined : {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'MM/dd HH:mm',
            day: 'MM/dd'
          }
        },
        title: {
          display: true,
          text: '時刻',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'メトリクス値',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: (value: any) => {
            if (typeof value === 'number') {
              return value.toLocaleString();
            }
            return value;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    }
  };

  const chartProps = {
    data: processedData,
    options,
    height,
    width
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border" style={{ height: height + 80 }}>
      {type === 'line' && <Line {...chartProps} />}
      {type === 'bar' && <Bar {...chartProps} />}
      {type === 'doughnut' && <Doughnut {...chartProps} />}
      {type === 'radar' && <Radar {...chartProps} />}
    </div>
  );
};

/**
 * プリセットチャート：DNS応答時間トレンド
 */
export const ResponseTimeChart: React.FC<{
  data: MetricDataPoint[];
  realtime?: boolean;
}> = ({ data, realtime = false }) => (
  <MetricsChart
    type="line"
    title="DNS応答時間トレンド"
    datasets={[{
      label: '平均応答時間 (ms)',
      data,
      borderColor: '#3B82F6',
      backgroundColor: '#3B82F620',
      fill: true
    }]}
    realtime={realtime}
    height={250}
  />
);

/**
 * プリセットチャート：クエリタイプ分布
 */
export const QueryTypeChart: React.FC<{
  data: { type: string; count: number }[];
}> = ({ data }) => (
  <MetricsChart
    type="doughnut"
    title="DNSクエリタイプ分布"
    datasets={[{
      label: 'クエリ数',
      data: data.map(item => ({
        timestamp: '',
        value: item.count,
        label: item.type
      }))
    }]}
    height={250}
    showLegend={true}
  />
);

/**
 * プリセットチャート：エラー率推移
 */
export const ErrorRateChart: React.FC<{
  data: MetricDataPoint[];
  realtime?: boolean;
}> = ({ data, realtime = false }) => (
  <MetricsChart
    type="bar"
    title="エラー率推移"
    datasets={[{
      label: 'エラー率 (%)',
      data,
      backgroundColor: '#EF444420',
      borderColor: '#EF4444'
    }]}
    realtime={realtime}
    height={250}
  />
);

/**
 * プリセットチャート：地理的分布レーダー
 */
export const GeographicRadarChart: React.FC<{
  data: { region: string; percentage: number; quality: number }[];
}> = ({ data }) => (
  <MetricsChart
    type="radar"
    title="地理的分布・品質分析"
    datasets={[
      {
        label: 'トラフィック分布 (%)',
        data: data.map(item => ({
          timestamp: '',
          value: item.percentage,
          label: item.region
        })),
        borderColor: '#10B981',
        backgroundColor: '#10B98120'
      },
      {
        label: '品質スコア',
        data: data.map(item => ({
          timestamp: '',
          value: item.quality,
          label: item.region
        })),
        borderColor: '#F59E0B',
        backgroundColor: '#F59E0B20'
      }
    ]}
    height={300}
  />
);

export default MetricsChart;