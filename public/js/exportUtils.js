function exportToExcel(data, filename) {
    try {
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('No hay datos para exportar');
        }

        // Convert data to worksheet
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // Add some styling
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for(let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_col(C) + "1";
            if(!worksheet[address]) continue;
            worksheet[address].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: "CCCCCC" } }
            };
        }
        
        // Create workbook and add worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cultivos');
        
        // Generate Excel file
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        return true;
    } catch (error) {
        console.error('Error exportando a Excel:', error);
        throw error;
    }
}

function exportToPDF(data, columns, filename) {
    try {
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('No hay datos para exportar');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(18);
        doc.text(filename, 14, 22);

        // Configure autotable
        doc.autoTable({
            head: [columns.map(col => col.header)],
            body: data.map(item => columns.map(col => item[col.key] || '')),
            startY: 30,
            margin: { top: 25 },
            styles: { 
                overflow: 'linebreak',
                cellWidth: 'wrap',
                fontSize: 8
            },
            headStyles: {
                fillColor: [200, 200, 200],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
            }
        });

        // Save PDF
        doc.save(`${filename}.pdf`);
        return true;
    } catch (error) {
        console.error('Error exportando a PDF:', error);
        throw error;
    }
}
