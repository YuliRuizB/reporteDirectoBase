import { Component, inject } from '@angular/core';
import { AuthenticationService } from '../../services/authentication.service';
import { configuationsService } from '../../services/configurations.service';
import { map } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-configurations',
  templateUrl: './configurations.component.html',
  styleUrl: './configurations.component.css'
})
export class ConfigurationsComponent {
  switchValue = false;
  title: string = "";
  description: string = "";
  selectedUid: string = "";
  selectWorkUid: string = "";
  evidenceList: any = [];
  workList: any = [];
  isModalVisible: boolean = false;
  isModalVisibleE: boolean = false;
  isModalWorkVisible: boolean = false;
  isModalWorkVisibleE: boolean = false;
  editEvidence: string = '';
  editWork: string = "";
  addEvidence: string = '';
  addEvidenceWork:string ="";
  selectedData: any = null;
  authService = inject(AuthenticationService);
  configService = inject(configuationsService);
  user: any;

  constructor(private messageService: NzMessageService) {

    this.authService.user.subscribe((user: any) => {
      if (user) {
        this.user = user;
        this.loadDataCustomer(this.user.customerId);
        this.loadEvidenceType(this.user.customerId);
        this.loadWorkType(this.user.customerId);
      } else {
        this.user = [];
      }
    });

  }

  sendMessage(type: string, message: string): void {
    this.messageService.create(type, message);
  }
  loadEvidenceType(customerId: string) {
    this.configService.getEvidenceTypeList(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((evidenceList: any) => {
      this.evidenceList = evidenceList;
    });
  }

  loadWorkType(customerId: string) {
    this.configService.getEvidenceWorkTypeList(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((workList: any) => {
      this.workList = workList;
    });
  }




  loadDataCustomer(customerId: string) {
    this.configService.getConfigurations(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return {
          id,
          ...data
        };
      }))
    ).subscribe((config: any) => {
      this.title = config[0].birthdayTitle;
      this.description = config[0].birthdayDescription;
      this.switchValue = config[0].isBirthdayConfig;
    });
  }


  openNewModal(data: any) {
    this.isModalVisible = true;
    this.isModalVisibleE = false;
  }
  openAddWorkModal() {
    this.isModalWorkVisible = true;
    this.isModalWorkVisibleE = false;
  }

  openEditWorkModal() {
    if (this.selectWorkUid.length <= 0) {
      this.sendMessage("error", "Favor de seleccionar un tipo de Trabajo a Editar ");
      this.isModalVisibleE = false;
      return
    }

    const selectedWork = this.workList.find((e: any) => e.uid === this.selectWorkUid);

    if (selectedWork) {
      this.editWork = selectedWork.name;
    } else {
      this.sendMessage("error", "No se encontró la evidencia seleccionada.");
      return;
    }
    this.isModalWorkVisible = false;
    this.isModalWorkVisibleE = true;


  }

  openEditModal() {

    if (this.selectedUid.length <= 0) {
      this.sendMessage("error", "Favor de seleccionar un tipo de Evidencia a Editar ");
      this.isModalVisibleE = false;
      return
    }

    const selectedEvidence = this.evidenceList.find((e: any) => e.uid === this.selectedUid);

    if (selectedEvidence) {
      this.editEvidence = selectedEvidence.name;
    } else {
      this.sendMessage("error", "No se encontró la evidencia seleccionada.");
      return;
    }
    this.isModalVisible = false;
    this.isModalVisibleE = true;
  }

  handleAddCancel() {
    this.isModalVisible = false;
    this.isModalVisibleE = false;
    this.isModalWorkVisible = false;
    this.isModalWorkVisibleE = false;
    this.editEvidence = '';
    this.editWork = "";
    this.addEvidence = "";
    this.addEvidenceWork = "";
  }

  saveRecord() {
    const evidenceType = {
      active: true,
      customerId: this.user.customerId,
      name: this.addEvidence
    }
    this.configService.addEvidenceType(evidenceType).then(() => {
      this.sendMessage("success", "Agrego el tipo de Evidencia con éxito");
      this.isModalVisible = false;
      this.addEvidence = '';
    }).catch((error) => {
      this.sendMessage("error", "Ocurrió un error al agregar la evidencia: " + error);
    });
  }

   saveRecordWork() {
    const evidenceWorkType = {
      active: true,
      customerId: this.user.customerId,
      name: this.addEvidenceWork
    }
    
    this.configService.addEvidenceWorkType(evidenceWorkType).then(() => {
      this.sendMessage("success", "Agrego el tipo de Trabajo con éxito.");
      this.isModalWorkVisible = false;
      this.addEvidenceWork = '';
    }).catch((error) => {
      this.sendMessage("error", "Ocurrió un error al agregar la evidencia: " + error);
    });
  }

  saveRecordE() {

    const selectedEvidence = this.evidenceList.find((e: any) => e.uid === this.selectedUid);

    if (selectedEvidence && this.editEvidence !== '') {
      this.configService.updateEvidenceType(this.selectedUid, this.editEvidence).then(() => {
        this.sendMessage("success", "Se actualizó con éxito el Tipo de Evidencia.");
        this.isModalVisibleE = false;
      }).catch((error) => {
        this.sendMessage("error", "Ocurrió un error al actualizar: " + error);
      });
    } else {
      this.sendMessage("error", "Validar la información");
      return;
    }
  }

  saveRecordWorkE() {

    const selectedWorkEvidence = this.workList.find((e: any) => e.uid === this.selectWorkUid);

    if (selectedWorkEvidence && this.editWork !== '') {
      this.configService.updateEvidenceWorkType(this.selectWorkUid, this.editWork).then(() => {
        this.sendMessage("success", "Se actualizó con éxito el Tipo de Trabajo.");
        this.isModalWorkVisibleE = false;
      }).catch((error) => {
        this.sendMessage("error", "Ocurrió un error al actualizar: " + error);
      });
    } else {
      this.sendMessage("error", "Validar la información");
      return;
    }
  }

  deleteResponse() {
    if (this.selectedUid) {
      this.configService.updateStatusEvidenceType(this.selectedUid).then(() => {
        this.sendMessage("error", 'Se borro el registro con éxito');
        this.isModalVisibleE = false;
      });
    }
  }

  deleteResponseWork() {
     if (this.selectWorkUid) {
      this.configService.updateStatusEvidenceWorkType(this.selectWorkUid).then(() => {
        this.sendMessage("error", 'Se borro el registro con éxito');
        this.isModalVisibleE = false;
      });
    }
  }

  saveData() {
    if (!this.switchValue || !this.title?.trim() || !this.description?.trim()) {
      this.sendMessage("error", "Titulo y descripción son obligatorios en caso de activar felicitaciones atomaticas");
      return;
    }

    this.configService.updateConfiguration(this.user.customerId, this.switchValue,
      this.title, this.description).then(() => {
        this.sendMessage("success", "Se actualizó con éxito la configuración del cliente.");
      }).catch((error) => {
        this.sendMessage("error", "Ocurrió un error al actualizar: " + error);
      });

  }
}
