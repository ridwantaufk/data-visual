import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const generatePDF = () => {
  const pdf = new jsPDF();

  const input1 = document.getElementById("report1");
  if (input1) {
    html2canvas(input1).then((canvas) => {
      const imgData1 = canvas.toDataURL("image/png");
      pdf.addImage(
        imgData1,
        "PNG",
        10,
        10,
        190,
        (canvas.height * 190) / canvas.width
      );
      pdf.addPage();

      const input2 = document.getElementById("report2");
      if (input2) {
        html2canvas(input2).then((canvas) => {
          const imgData2 = canvas.toDataURL("image/png");
          pdf.addImage(
            imgData2,
            "PNG",
            10,
            10,
            190,
            (canvas.height * 190) / canvas.width
          );
          pdf.save("report.pdf");
        });
      } else {
        console.error('Element with ID "report2" not found.');
      }
    });
  } else {
    console.error('Element with ID "report1" not found.');
  }
};
