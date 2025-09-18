import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { evidenceService } from '../../services/evidence.service';
import { AuthenticationService } from '../../services/authentication.service';
import { lastValueFrom, map, take } from 'rxjs';
import { Evidence } from '../../interface/evidence.type';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { myProfileService } from '../../services/myprofile.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { notify } from '../../interface/notify.type';
import { NotificationService } from '../../services/notifications.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

@Component({
  selector: 'app-evidence',
  templateUrl: './evidence.component.html',
  styleUrl: './evidence.component.css'
})

export class EvidenceComponent {
  evidenceService = inject(evidenceService);
  authService = inject(AuthenticationService);
  myprofileService = inject(myProfileService);
  user: any;
  dataImages: any[] = [];
  dataImagesExport: any[] = [];
  effect = 'scrollx';
  totEvidence: number = 0;
  totEvidencePending: number = 0;
  totEvidenceReview: number = 0;
  totEvidenceApproved: number = 0;
  totEvidenceReject: number = 0;
  totEvidenceFinalize: number = 0;
  listOfData: Evidence[] = [];
  filteredData: Evidence[] = [];
  filteredDataFilter: Evidence[] = [];
  selectedStatus: string = '';
  selectResponse: string = '';
  title: string = '';
  isNewResponseModalVisible = false;
  selectedResponseUid: string = '';
  selectEvidenceType: string = 'Todos';
  selectWorkEvidenceType: string = 'Todos';
  description: string = '';
  private isSending = false;
  responseList: any = [];
  evidenceTypeList: any = [];
  evidenceWorkTypeList: any = [];
  comments: string = '';
  cost: string = '';
  notifyList: any[] = [];
  dateRange: Date[] | null = null;

  statusList = [
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'REVIEW', label: 'En Revisión' },
    { value: 'REJECT', label: 'Rechazado' },
    { value: 'APPROVED', label: 'Aprobado' },
    { value: 'FINALIZED', label: 'Finalizado' }
  ];
  isVisible = false;
  selectedData: any = null;
  newResponse = {
    active: true,
    title: '',
    customerId: '',
    uid: '',
    description: '',
    status: '',
    comments: '',
    cost: ''
  };
  isEditModalVisible = false;
  editResponse: any = {};

  constructor(private message: NzMessageService, private storage: AngularFireStorage, private notificationService: NotificationService, private cdr: ChangeDetectorRef) {

    this.authService.user.subscribe((user: any) => {
      if (user) {
        this.user = user;
        this.loadEvidences(this.user.customerId);
        this.LoadEvidenceType(this.user.customerId);
        this.LoadEvidenceWorkType(this.user.customerId);
      } else {
        this.user = [];
      }
    });
  }

  LoadEvidenceType(customerId: string) {
    this.evidenceService.getEvidenceType(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((evidenceList: any[]) => {
      this.evidenceTypeList = evidenceList;
    });
  }

  LoadEvidenceWorkType(customerId: string) {
    this.evidenceService.getEvidenceWorkType(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((evidenceList: any[]) => {
      this.evidenceWorkTypeList = evidenceList;
    });
  }

  loadEvidences(customerId: string) {
    this.evidenceService.getEvidence(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((evidenceList: Evidence[]) => {
      this.listOfData = evidenceList;
      this.filteredData = [...this.listOfData];
      this.filteredDataFilter = [...this.listOfData];
      this.selectEvidenceTypeOption();
      this.updatePendingCount();
    });
  }

  filterTot(): void {
    this.filteredData = this.listOfData;
  }

  filterPending(): void {
    this.filteredData = this.listOfData.filter(item => item.status === 'PENDING');
  }

  filterReview(): void {
    this.filteredData = this.listOfData.filter(item => item.status === 'REVIEW');
  }

  filterApproved(): void {
    this.filteredData = this.listOfData.filter(item => item.status === 'APPROVED');
  }

  filterReject(): void {
    this.filteredData = this.listOfData.filter(item => item.status === 'REJECT');
  }

  filterFinalized(): void {
    this.filteredData = this.listOfData.filter(item => item.status === 'FINALIZED');
  }

  updatePendingCount(): void {
    this.totEvidencePending = this.listOfData.filter(item => item.status === 'PENDING').length;
    this.totEvidence = this.listOfData.length;
    this.totEvidenceReview = this.listOfData.filter(item => item.status === 'REVIEW').length;
    this.totEvidenceApproved = this.listOfData.filter(item => item.status === 'APPROVED').length;
    this.totEvidenceReject = this.listOfData.filter(item => item.status === 'REJECT').length;
    this.totEvidenceFinalize = this.listOfData.filter(item => item.status === 'FINALIZED').length;
  }

  openModal(data: any): void {
    this.selectedStatus = "";
    this.selectedResponseUid = "";
    this.title = "";
    this.description = "";
    this.comments = "";
    this.cost = "";
    this.selectedData = data;

    this.evidenceService.getEvidenceImages(data.idDoc).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))).subscribe((data: any) => {
        this.dataImages = data;
        setTimeout(() => this.cdr.detectChanges(), 0);
      });


    this.isVisible = true;
    this.callNotifyEvidence(this.selectedData.idDoc);
  }

  handleCancel(): void {
    this.isVisible = false;
    this.selectedData = null;
    //this.notifyList = [];
  }

  callNotifyEvidence(idDoc: string) {
    this.evidenceService.getNotifyEvidence(idDoc).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((notify: any[]) => {
      this.notifyList = notify;
    });
  }

  async changeStatus(): Promise<void> {
    if (this.selectedData) {

      if (!this.selectedStatus || !this.title.trim() || !this.description.trim()) {
        this.message.error('Reporte directo informa. ' + 'Faltan datos por llenar, favor de validar.');
        return;
      }
      // add notify
      const noty: notify = {
        active: true,
        date: new Date(), // Asigna la fecha actual
        name: `${this.selectedData.name} ${this.selectedData.lastName} ${this.selectedData.secondLastName}`,
        email: this.selectedData.email,
        title: this.title,
        description: this.description,
        customerId: this.user.customerId,
        uidUser: this.selectedData.uid,
        comments: this.comments,
        cost: this.cost,
        evidenceType: this.selectedData.evidenceType ? this.selectedData.evidenceType : '',
        evidenceId: this.selectedData.idDoc ? this.selectedData.idDoc : '',
        status: this.selectedStatus
      };
      this.evidenceService.addNotify(noty);
      this.evidenceService.updateStatusEvidence(this.selectedData.id, this.selectedStatus);

      const evidenceId = await this.evidenceService.findEvidenceDocId(this.selectedData.uid, this.selectedData.id);
      this.evidenceService.updateStatusEvidenceUser(this.selectedData.uid, evidenceId, this.selectedStatus);
      this.myprofileService.getUserData(this.selectedData.uid)
        .pipe(take(1))
        .subscribe((user: any) => {
          if (user?.token) {
            this.enviarNotificacion(user.token, this.title, this.description);
          }
        });
      this.isVisible = false;

    }
  }

  async enviarNotificacion(token: string, title: string, description: string) {
    if (this.isSending) {
      return;
    }
    this.isSending = true; // Marca que está en proceso
    try {
      await lastValueFrom(this.notificationService.sendPushNotification(title, description, token));
    } catch (error) {
      console.error('Error al enviar la notificación:', error);
    } finally {
      this.isSending = false; // Restablece la bandera al terminar
    }
  }

  updateDefaultMessage(data: any) {
    const caseTitle = data.title ? `"${data.title}"` : "sin título";
    const name = this.selectedData.name + ' ' + this.selectedData.lastName + ' ' + this.selectedData.secondLastName
    if (this.selectedStatus === 'REVIEW') {
      this.title = `Hola, ${name} ,  El caso ${caseTitle} ha cambiado a estatus en Revisión`;
    } else if (this.selectedStatus === 'APPROVED') {
      this.title = `Hola, ${name} , El caso ${caseTitle} ha cambiado a estatus Aprobado`;
    } else if (this.selectedStatus === 'FINALIZED') {
      this.title = `Hola, ${name} , El caso ${caseTitle} ha cambiado a estatus Finalizado`;
    } else if (this.selectedStatus === 'PENDING') {
      this.title = `Hola, ${name} , El caso ${caseTitle} ha cambiado a estatus Pendiente`;
    } else if (this.selectedStatus === 'REJECT') {
      this.title = `Hola, ${name} , El caso ${caseTitle} ha cambiado a estatus Rechazado`;
    }
    this.evidenceService.getResponseList(data.customerId, this.selectedStatus).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((list: any) => {
      this.responseList = list;
    });
  }

  selectResponseInfo() {
    const response = this.responseList.find((r: any) => r.uid === this.selectedResponseUid);
    if (response) {
      this.description = response.description;
    }
  }

  selectEvidenceTypeOption() {
    this.applyFilters();
  }

  selectWorkEvidenceTypeOption() {
    this.applyFilters();
  }

  openNewResponseModal(data: any) {
    this.isNewResponseModalVisible = true;
    this.newResponse = {
      active: true,
      title: '',
      customerId: data.customerId,
      uid: '',
      description: '',
      status: this.selectedStatus,
      comments: '',
      cost: ''
    };
  }

  handleNewResponseCancel() {
    this.isNewResponseModalVisible = false;
    this.newResponse = {
      active: true,
      title: '',
      customerId: '',
      uid: '',
      description: '',
      status: this.selectedStatus,
      comments: '',
      cost: ''
    };
    this.description = "";
    this.title = "";
    this.comments = "";
    this.cost = "";
    this.selectedResponseUid = "";
    this.selectedStatus = "";
  }

  saveNewResponse() {
    const { title, description, status } = this.newResponse;

    if (!title || !description || !status) {
      this.message.warning('Por favor completa todos los campos.');
      return;
    }
    this.evidenceService.addResponseList(this.newResponse);
    this.message.success('Respuesta guardada correctamente');

    this.isNewResponseModalVisible = false;
    this.newResponse = {
      active: true,
      title: '',
      customerId: '',
      uid: '',
      description: '',
      status: this.selectedStatus,
      comments: "",
      cost: ""
    };
  }
  openEditResponseModal() {
    const selected = this.responseList.find((r: any) => r.uid === this.selectedResponseUid);

    if (!selected) {
      this.message.warning('Primero selecciona una respuesta para editar.');
      return;
    }
    this.editResponse = { ...selected };
    this.isEditModalVisible = true;
  }

  handleEditCancel() {
    this.isEditModalVisible = false;
    this.editResponse = {};
  }

  saveEditedResponse() {
    // Aquí implementas la lógica de guardar
    if (this.editResponse.uid) {
      this.evidenceService.updateResponse(this.editResponse.uid, {
        title: this.editResponse.title,
        description: this.editResponse.description
      }).then(() => {
        this.message.success('Respuesta actualizada correctamente');
        this.isEditModalVisible = false;
        this.updateDefaultMessage(this.selectedData);
      }).catch(() => {
        this.message.error('Error al actualizar la respuesta');
      });
    }
  }

  deleteResponse() {
    if (this.editResponse.uid) {
      this.evidenceService.updateStatusResponseList(this.editResponse.uid).then(() => {
        this.message.success('Registro dado de baja');
        this.isEditModalVisible = false;
        this.selectedResponseUid = "";
        this.updateDefaultMessage(this.selectedData);
      });
    }
  }

  exportToExcel() {

    this.evidenceService.getEvidenceImages
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evidencias');

    // Guardar el archivo
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'Evidencias.xlsx');
  }

  getFormattedDate(timestamp: any): string {
    if (!timestamp || !timestamp.seconds) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString();
  }

  applyFilters() {

    this.filteredData = this.filteredDataFilter.filter((item: any) => {
      const matchEvidence =
        this.selectEvidenceType === "Todos" || item.evidenceTypeUid === this.selectEvidenceType;

      const matchWork =
        this.selectWorkEvidenceType === "Todos" || item.evidenceWorkTypeUid === this.selectWorkEvidenceType;

      let matchDate = true;
      if (this.dateRange && this.dateRange.length === 2) {
        const start = this.dateRange[0];
        const end = this.dateRange[1];

        // Convertir el string ISO a Date
        const itemDate = item.date ? new Date(item.date) : null;
        if (itemDate) {
          // Comparar fechas (sin incluir la hora)
          matchDate = itemDate >= start && itemDate <= end;
        }
      }

      return matchEvidence && matchWork && matchDate;
    });
  }
  async exportToPDF() {
    const doc = new jsPDF();

    for (let i = 0; i < this.filteredData.length; i++) {
      const evidence = this.filteredData[i];

      // Agregar información de la evidencia
      doc.setFontSize(12);
      doc.text(`Título: ${evidence.title}`, 10, 10);
      doc.text(`Descripción: ${evidence.description || '-'}`, 10, 20);
      doc.text(`Fecha: ${evidence.date ? evidence.date.toString() : '-'}`, 10, 30);
      doc.text(`Nombre: ${evidence.name || '-'}`, 10, 40);
      doc.text(`Colonia: ${evidence.colony || '-'}`, 10, 50);

      // Si la evidencia tiene idDoc, obtener todas las imágenes
      if (evidence.idDoc) {
        const images = await this.getEvidenceImagesAsync(evidence.idDoc); // 🔹 ahora espera

        let yPosition = 60;
        for (const img of images) {
          if (img.imageUrl) {
            try {
              const imgData = await this.getImageData(img.imageUrl);
              doc.addImage(imgData, 'JPEG', 10, yPosition, 180, 100);
              yPosition += 110;

              // Si llegamos al final de la página, crear nueva
              if (yPosition + 100 > 290) {
                doc.addPage();
                yPosition = 10;
              }
            } catch (err) {
              console.error('Error cargando imagen:', err);
            }
          }
        }
      }

      // Si no es la última evidencia, agregar nueva página
      if (i < this.filteredData.length - 1) {
        doc.addPage();
      }
    }

    doc.save('Evidencias.pdf');
  }

  // Convertir observable en promesa
  private getEvidenceImagesAsync(evidenceId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.evidenceService.getEvidenceImages(evidenceId).pipe(
        map((actions: any) =>
          actions.map((a: any) => {
            const id = a.payload.doc.id;
            const data = a.payload.doc.data() as any;
            return { id, ...data };
          })
        )
      ).subscribe({
        next: (data: any[]) => resolve(data),
        error: (err) => reject(err)
      });
    });
  }


  private async getImageData(path: string): Promise<string> {
    try {

      // ⚡ Usa refFromURL si tienes un URL completo
      const ref = this.storage.refFromURL(path);
      const downloadURL = await ref.getDownloadURL().toPromise();

      const response = await fetch(downloadURL);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('Error obteniendo imagen desde Firebase Storage', err);
      throw err;
    }
  }
}
