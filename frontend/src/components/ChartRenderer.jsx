import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function ChartRenderer({ spec }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !spec) return;

    const data = spec.data || [];
    const layout = {
      ...spec.layout,
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'Google Sans, Inter, sans-serif',
        color: '#e3e3e3',
        size: 12,
      },
      margin: { l: 40, r: 20, t: 40, b: 40 },
      autosize: true,
    };

    const config = {
      responsive: true,
      displayModeBar: false,
    };

    Plotly.newPlot(chartRef.current, data, layout, config);

    const handleResize = () => {
      if (chartRef.current) {
        Plotly.Plots.resize(chartRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, [spec]);

  return (
    <div style={{
      width: '100%',
      minHeight: '380px',
      backgroundColor: '#1b1c1d',
      borderRadius: '16px',
      border: '1px solid #2d2f31',
      padding: '12px',
      marginTop: '14px',
      marginBottom: '14px',
    }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
