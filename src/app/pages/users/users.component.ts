import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { welcomeService } from '../../services/welcome.service';
import { AuthenticationService } from '../../services/authentication.service';
import { map } from 'rxjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { configuationsService } from '../../services/configurations.service';
import { NzMessageService } from 'ng-zorro-antd/message';

interface Column {
  title: string;
  compare: (a: DataItem, b: DataItem) => number;
  priority: boolean;
  filters: { text: string, value: any }[];
  filterFn: ((list: string[], item: DataItem) => boolean) | null;
}

interface DataItem {
  name: string;
  lastName: string;
  secondLastName: string;
  email: string;
  gender: string;
  phoneNumber: string;
  address: string;
  postalCode: string;
  age: string;
  town: string;
  state: string;
  role: string;
  idDoc: string;
}

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  welcomeService = inject(welcomeService);
  authService = inject(AuthenticationService);
  configService = inject(configuationsService);
  totUsers: string = "0";
  user: any;
  listOfData: DataItem[] = [];
  listOfColumn: Column[] = [];
  isEditModalVisible = false;
  selectedUser: any = null;
  searchValue: string = '';
  filteredData: DataItem[] = [];

  constructor(private cdr: ChangeDetectorRef,
    private messageService: NzMessageService
  ) {


    this.authService.user.subscribe((user: any) => {
      if (user) {
        this.user = user;
        this.totalUsers(this.user.customerId);
      } else {
        this.user = [];
      }
    });
  }

  getUniqueFilters(field: keyof DataItem): { text: string; value: string }[] {
    if (!this.listOfData || this.listOfData.length === 0) {
      return [];
    }
    return Array.from(new Set(this.listOfData.map(item => item[field])))
      .map(value => ({ text: value, value: value }));
  }

  totalUsers(customerId: string) {
    this.welcomeService.getUsers(customerId).pipe(
      map((actions: any) => actions.map((a: any) => {
        const id = a.payload.doc.id;
        const data = a.payload.doc.data() as any;
        return { id, ...data };
      }))
    ).subscribe((tot: any) => {
      this.totUsers = tot.length;
      this.listOfData = tot;
      this.filteredData = [...this.listOfData];
      this.initColumns();
    });

  }

  openEditModal(user1: DataItem) {
    if (user1) {
      this.selectedUser = { ...user1 }; // copia para no modificar directo
      this.isEditModalVisible = true;
      this.cdr.detectChanges();
    } else {
      this.isEditModalVisible = false;
    }
  }

  handleCancel() {
    this.isEditModalVisible = false;
    this.selectedUser = null;
  }
  updateUser() {
    if (this.selectedUser) {
      this.configService.updateUserRol(this.selectedUser.idDoc, this.selectedUser.role).then(() => {
        this.sendMessage("sucess", 'Se actualizo el rol de usuario con exito');
        this.isEditModalVisible = false;
      });

      // Actualizar en lista local
      const index = this.listOfData.findIndex(u => u.email === this.selectedUser!.email);
      if (index > -1) {
        this.listOfData[index] = this.selectedUser!;
      }


    }
  }


  ngOnInit(): void {
  }

  initColumns() {
    this.listOfColumn = [
      {
        title: 'Nombre',
        compare: (a: DataItem, b: DataItem) => a.name.localeCompare(b.name),
        priority: false,
        filters: [],
        filterFn: null
      },
      {
        title: 'Correo',
        compare: (a: DataItem, b: DataItem) => a.email.localeCompare(b.email),
        priority: false,
        filters: [],
        filterFn: null
      },
      {
        title: 'Genero',
        compare: (a: DataItem, b: DataItem) => a.gender.localeCompare(b.gender),
        priority: false,
        filters: this.getUniqueFilters('gender') ?? [],
        filterFn: (list: string[], item: DataItem) => list.some(gender => item.gender.indexOf(gender) !== -1)
      },
      {
        title: 'Teléfono',
        compare: (a: DataItem, b: DataItem) => a.phoneNumber.localeCompare(b.phoneNumber),
        priority: false,
        filters: [],
        filterFn: null
      },
      {
        title: 'Dirección',
        compare: (a: DataItem, b: DataItem) => a.address.localeCompare(b.address),
        priority: false,
        filters: [],
        filterFn: null
      },
      {
        title: 'Código Postal',
        compare: (a: DataItem, b: DataItem) => a.postalCode.localeCompare(b.postalCode),
        priority: false,
        filters: [],
        filterFn: null
      },
      {
        title: 'Edad',
        compare: (a: DataItem, b: DataItem) => a.age.localeCompare(b.age),
        priority: false,
        filters: [],
        filterFn: null
      },
      {
        title: 'Municipio',
        compare: (a: DataItem, b: DataItem) => a.town.localeCompare(b.town),
        priority: false,
        filters: this.getUniqueFilters('town') ?? [],
        filterFn: (list: string[], item: DataItem) => list.some(town => item.town.indexOf(town) !== -1)
      },
      {
        title: 'Estado',
        compare: (a: DataItem, b: DataItem) => a.state.localeCompare(b.state),
        priority: false,
        filters: this.getUniqueFilters('state') ?? [],
        filterFn: (list: string[], item: DataItem) => list.some(state => item.state.indexOf(state) !== -1)
      },
      {
        title: 'Tipo',
        compare: (a: DataItem, b: DataItem) => a.state.localeCompare(b.role),
        priority: false,
        filters: this.getUniqueFilters('role') ?? [],
        filterFn: (list: string[], item: DataItem) => list.some(state => item.state.indexOf(state) !== -1)
      }
    ];
  }

  sendMessage(type: string, message: string): void {
    this.messageService.create(type, message);
  }

  exportToExcel(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.listOfData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

    // Guardar el archivo
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'Usuarios.xlsx');
  }

  search() {    
    const value = this.searchValue.toLowerCase();
    this.filteredData = this.listOfData.filter(item =>
      `${item.name} ${item.lastName} ${item.secondLastName}`.toLowerCase().includes(value)
    );
  }
}